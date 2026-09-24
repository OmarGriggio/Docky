import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { QuoteDto, QuoteSectionDto } from "../quote.types";
import { fillPlaceholders } from "../placeholders";
import { buildDocumentValues } from "../document.placeholders";

// Same shape/ordering rules as invoice.dto.ts's buildSections - document.sections/
// lines aren't ordered by `position` from the DB, and an emptied-out section
// (everything archived, or nothing added yet) is skipped rather than shown
// as a bare heading.
const buildSections = (document: DocumentComplete): QuoteSectionDto[] => {
    return [...document.sections]
        .sort((a, b) => a.position - b.position)
        .map(section => ({
            title: section.title,
            description: section.description,
            lines: document.lines
                .filter(line => line.section_id === section.id)
                .sort((a, b) => a.position - b.position)
                .map(line => ({
                    label: line.label,
                    quantity: line.quantity,
                    unit: line.unit,
                    unitPrice: line.unit_price,
                })),
        }))
        .filter(section => section.lines.length > 0);
};

// Same rule as invoice.dto.ts's own resolveBillingAddress - always the
// client's primary address (or their first, if none is marked primary).
// Never documents.address_id - a quote has no Lieu/Bâtiment concept.
const resolveBillingAddress = (client: ClientWithAddresses) => {
    return client.addresses.find(a => a.is_primary) ?? client.addresses[0];
};

export const createQuoteDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company): QuoteDto => {
    const address = resolveBillingAddress(client);
    // {{titre_client}}/{{date}}/{{montant}}/{{signature_entreprise}} in the introduction/conclusion.
    const placeholders = buildDocumentValues(document, client.title, company.name);

    return {
        number: document.number,
        date: document.date,
        validUntil: document.due_date,
        company: {
            name: company.name ?? "",
            street: company.street ?? "",
            city: company.city ?? "",
            postalCodeCity: `${company.postal_code ?? ""} ${company.city ?? ""}`,
            logo: company.logo,
        },
        client: {
            name: client.company_name ?? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim(),
            street: address ? `${address.street}` : "",
            city: address?.city ?? "",
            postalCodeCity: address ? `${address.postal_code ?? ""} ${address.city ?? ""}` : "",
        },
        sections: buildSections(document),
        introduction: fillPlaceholders(document.introduction ?? "", placeholders),
        conclusion: fillPlaceholders(document.conclusion ?? "", placeholders),
        paymentTerms: company.payment_terms,
    };
}
