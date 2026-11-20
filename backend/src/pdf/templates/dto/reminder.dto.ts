import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { ReminderDto } from "../reminder.types";
import { buildReminderValues } from "../reminder.placeholders";
import { richTextOf } from "../rich-text";
import { PDF_LABELS, toPdfLanguage } from "../pdf-labels";
import { buildLetterDto, placeholderSourceOf } from "./shared";
import { TemplateStyle } from "../../../modules/templates/template.types";

// templateText is the template's reminder text, raw (with its {{placeholders}}).
export const createReminderDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company, style: TemplateStyle, templateText: string): ReminderDto => {
    const language = toPdfLanguage(client.language);
    const today = new Date();
    const letter = buildLetterDto(document, client, company, style, language);

    return {
        // Its own date, and none of the invoice's introduction/conclusion -
        // the reminder's text stands in for them.
        letter: { ...letter, date: today, introduction: [], conclusion: [] },
        greeting: client.title?.trim() || PDF_LABELS[language].defaultClientTitle,
        text: richTextOf(templateText, buildReminderValues(placeholderSourceOf(document, client, company, language), today)),
    };
};
