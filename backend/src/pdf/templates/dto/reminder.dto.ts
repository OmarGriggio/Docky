import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { ReminderDto } from "../reminder.types";
import { buildReminderValues } from "../reminder.placeholders";
import { fillPlaceholders } from "../placeholders";
import { toPdfLanguage } from "../pdf-labels";
import { buildClientDto, buildCompanyDto } from "./shared";

// templateText is the raw REMINDER template (with its {{placeholders}}).
export const createReminderDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company, templateText: string): ReminderDto => {
    const language = toPdfLanguage(client.language);
    const clientDto = buildClientDto(client, document);
    const today = new Date();

    return {
        language,
        invoiceNumber: document.number,
        date: today,
        company: buildCompanyDto(company),
        client: {
            ...clientDto,
            title: client.title ?? "",
        },
        text: fillPlaceholders(templateText, buildReminderValues(document, clientDto.name, company.name ?? "", today, language)),
    };
};
