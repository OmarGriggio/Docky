import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { ReminderDto } from "../reminder.types";
import { buildReminderValues } from "../reminder.placeholders";
import { fillPlaceholders } from "../placeholders";

// Same billing-address rule as invoice.dto.ts - the client's primary address
// (or its first), never documents.address_id.
const resolveBillingAddress = (client: ClientWithAddresses) => {
    return client.addresses.find(a => a.is_primary) ?? client.addresses[0];
};

// templateText is the raw REMINDER template (with its {{placeholders}}).
export const createReminderDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company, templateText: string): ReminderDto => {
    const address = resolveBillingAddress(client);
    const clientName = client.company_name ?? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
    const today = new Date();

    return {
        invoiceNumber: document.number,
        date: today,
        company: {
            name: company.name ?? "",
            street: company.street ?? "",
            city: company.city ?? "",
            postalCodeCity: `${company.postal_code ?? ""} ${company.city ?? ""}`,
            logo: company.logo,
        },
        client: {
            name: clientName,
            street: address ? `${address.street}` : "",
            city: address?.city ?? "",
            postalCodeCity: address ? `${address.postal_code ?? ""} ${address.city ?? ""}` : "",
            title: client.title ?? "",
        },
        text: fillPlaceholders(templateText, buildReminderValues(document, clientName, company.name ?? "", today)),
    };
};
