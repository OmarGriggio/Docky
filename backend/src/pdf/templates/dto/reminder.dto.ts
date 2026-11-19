import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { ReminderDto } from "../reminder.types";
import { buildReminderValues } from "../reminder.placeholders";
import { richTextOf } from "../rich-text";
import { PDF_LABELS, toPdfLanguage } from "../pdf-labels";
import { buildLetterDto } from "./shared";

// templateText is the raw REMINDER template (with its {{placeholders}}).
export const createReminderDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company, templateText: string): ReminderDto => {
    const language = toPdfLanguage(client.language);
    const today = new Date();
    const letter = buildLetterDto(document, client, company, language);

    return {
        // Its own date, and none of the invoice's introduction/conclusion -
        // the reminder's text stands in for them.
        letter: { ...letter, date: today, introduction: [], conclusion: [] },
        greeting: client.title?.trim() || PDF_LABELS[language].defaultClientTitle,
        text: richTextOf(templateText, buildReminderValues(document, letter.client.name, company.name ?? "", today, language)),
    };
};
