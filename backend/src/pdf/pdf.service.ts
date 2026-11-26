import { InvoicePdfGenerator } from "./generators/invoice-pdf-generator";
import { QuotePdfGenerator } from "./generators/quote-pdf-generator";
import { ReminderPdfGenerator } from "./generators/reminder-pdf-generator";
import { getCompanyByIdServ } from "../modules/companies/company.service";
import { previewTemplateServ, reminderTextOf } from "../modules/templates/template.service";
import { withHighlight } from "../modules/templates/template.rules";
import { getReminderSettingsServ, reminderToPrintServ } from "../modules/reminders/reminder.service";
import { ReminderToPrint } from "./templates/reminder.types";
import { PREVIEW_KINDS, PreviewKind, sampleSourceOf } from "../modules/templates/template.sample";
import { Template, TemplateData } from "../modules/templates/template.types";
import { Language } from "../modules/users/user.types";
import { AppError } from "../shared/types/errors";

// One entry point per kind of PDF - what the steps are (load, prepare, draw,
// number, save) and what each kind does differently live in
// generators/document-pdf-generator.ts and its subclasses.

export const generateInvoicePdfServ = (documentId: number, company_id: number): Promise<Uint8Array> =>
    new InvoicePdfGenerator().generate(documentId, company_id);

export const generateQuotePdfServ = (documentId: number, company_id: number): Promise<Uint8Array> =>
    new QuotePdfGenerator().generate(documentId, company_id);

// Payment reminder for an invoice - the one of that `level` already sent, or
// the next one previewed (reminder.service.ts's reminderToPrintServ) - see
// ReminderPdfGenerator.
export const generateReminderPdfServ = async (documentId: number, company_id: number, level?: number): Promise<Uint8Array> =>
    new ReminderPdfGenerator(await reminderToPrintServ(documentId, company_id, level)).generate(documentId, company_id);

// The template editor's live preview: a sample quote, invoice or reminder
// (template.sample.ts) printed with the template as it's being edited - the
// stored one with `data`'s fields over it, checked like a save - and the
// company's own identity. Nothing is written.
export const generateTemplatePreviewServ = async (
    templateId: number,
    company_id: number,
    kind: unknown,
    data: Partial<Record<keyof TemplateData, unknown>>,
    language: Language,
    level: unknown = 1,
    // An element printed alone in the highlight color (the editor's "Repérer").
    highlight: unknown = null
): Promise<Uint8Array> => {
    if (!(PREVIEW_KINDS as readonly unknown[]).includes(kind)) {
        throw new AppError("type must be QUOTE, INVOICE or REMINDER", 400);
    }
    const template = withHighlight(await previewTemplateServ(templateId, company_id, data), highlight);
    const company = await getCompanyByIdServ(company_id);
    const source = sampleSourceOf(company, template, kind as PreviewKind, language);
    if (kind === "REMINDER") {
        return new ReminderPdfGenerator(await sampleReminderOf(template, company_id, level, language)).generateFrom(source);
    }
    return (kind === "QUOTE" ? new QuotePdfGenerator() : new InvoicePdfGenerator()).generateFrom(source);
};

// The sample reminder of that level (1 when it isn't one): the template's
// text of the level, today, the company's fees up to it.
const sampleReminderOf = async (template: Template, company_id: number, level: unknown, language: Language): Promise<ReminderToPrint> => {
    const reminderLevel = level === 2 || level === 3 ? level : 1;
    const levels = (await getReminderSettingsServ(company_id)).filter(item => item.enabled && item.level <= reminderLevel);
    return {
        level: reminderLevel,
        date: new Date(),
        text: reminderTextOf(template, language, reminderLevel),
        fee: levels.at(-1)?.level === reminderLevel ? levels.at(-1)!.fee : 0,
        totalFees: Math.round(levels.reduce((sum, item) => sum + item.fee, 0) * 100) / 100,
    };
};
