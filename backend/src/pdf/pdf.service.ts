import { InvoicePdfGenerator } from "./generators/invoice-pdf-generator";
import { QuotePdfGenerator } from "./generators/quote-pdf-generator";
import { ReminderPdfGenerator } from "./generators/reminder-pdf-generator";
import { getCompanyByIdServ } from "../modules/companies/company.service";
import { previewTemplateServ } from "../modules/templates/template.service";
import { PREVIEW_KINDS, PreviewKind, sampleSourceOf } from "../modules/templates/template.sample";
import { TemplateData } from "../modules/templates/template.types";
import { Language } from "../modules/users/user.types";
import { AppError } from "../shared/types/errors";

// One entry point per kind of PDF - what the steps are (load, prepare, draw,
// number, save) and what each kind does differently live in
// generators/document-pdf-generator.ts and its subclasses.

export const generateInvoicePdfServ = (documentId: number, company_id: number): Promise<Uint8Array> =>
    new InvoicePdfGenerator().generate(documentId, company_id);

export const generateQuotePdfServ = (documentId: number, company_id: number): Promise<Uint8Array> =>
    new QuotePdfGenerator().generate(documentId, company_id);

// Payment reminder for an invoice - see ReminderPdfGenerator.
export const generateReminderPdfServ = (documentId: number, company_id: number): Promise<Uint8Array> =>
    new ReminderPdfGenerator().generate(documentId, company_id);

// The template editor's live preview: a sample quote, invoice or reminder
// (template.sample.ts) printed with the template as it's being edited - the
// stored one with `data`'s fields over it, checked like a save - and the
// company's own identity. Nothing is written.
export const generateTemplatePreviewServ = async (
    templateId: number,
    company_id: number,
    kind: unknown,
    data: Partial<Record<keyof TemplateData, unknown>>,
    language: Language
): Promise<Uint8Array> => {
    if (!(PREVIEW_KINDS as readonly unknown[]).includes(kind)) {
        throw new AppError("type must be QUOTE, INVOICE or REMINDER", 400);
    }
    const template = await previewTemplateServ(templateId, company_id, data);
    const company = await getCompanyByIdServ(company_id);
    const source = sampleSourceOf(company, template, kind as PreviewKind, language);
    const generator = kind === "QUOTE" ? new QuotePdfGenerator() : kind === "INVOICE" ? new InvoicePdfGenerator() : new ReminderPdfGenerator();
    return generator.generateFrom(source);
};
