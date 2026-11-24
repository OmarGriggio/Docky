import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { ReminderDto, ReminderToPrint } from "../reminder.types";
import { buildReminderValues } from "../reminder.placeholders";
import { richTextOf } from "../rich-text";
import { PDF_LABELS, toPdfLanguage } from "../pdf-labels";
import { buildLetterDto, placeholderSourceOf } from "./shared";
import { TemplateStyle } from "../../../modules/templates/template.types";

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// `reminder`: which one (its level, date, raw text and fees - see
// ReminderToPrint). `balance`: what's left to pay on the invoice - a final
// invoice's deposits deducted - for {{montant}}; {{montant_tva}} stays the
// invoice's own VAT. The fees come on top, in the amounts block.
export const createReminderDto = (
    document: DocumentComplete,
    client: ClientWithAddresses,
    company: Company,
    style: TemplateStyle,
    reminder: ReminderToPrint,
    balance: number = document.amount_incl_vat
): ReminderDto => {
    const language = toPdfLanguage(client.language);
    const letter = buildLetterDto(document, client, company, style, language);
    const values = buildReminderValues(placeholderSourceOf(document, client, company, language, balance), reminder.date);

    return {
        // Its own date, and none of the invoice's introduction/conclusion -
        // the reminder's text stands in for them.
        letter: { ...letter, date: reminder.date, introduction: [], conclusion: [] },
        level: reminder.level,
        greeting: client.title?.trim() || PDF_LABELS[language].defaultClientTitle,
        text: richTextOf(reminder.text, values),
        amounts: reminder.totalFees > 0 ? { balance, fees: reminder.totalFees, total: round2(balance + reminder.totalFees) } : null,
    };
};
