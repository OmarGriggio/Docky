import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { clientDisplayName } from "../../../modules/clients/client.display";
import { Company } from "../../../modules/companies/company.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { lineTotal, round2 } from "../../../modules/documents/document.calculations";
import { ClientDto, CompanyDto, DocumentSectionDto } from "../document.types";
import { DocumentRecipient } from "../../../modules/documents/document.types";
import { LetterDto } from "../business-letter";
import { PdfLanguage } from "../pdf-labels";
import { fillPlaceholders } from "../placeholders";
import { buildDocumentValues } from "../document.placeholders";

// document.sections/lines are already scoped to this document and active-only
// (the repository queries default to is_active = true) - but neither comes
// back ordered by `position` from the DB (lines have no ORDER BY at all), so
// that has to happen here.
export const buildSections = (document: DocumentComplete): DocumentSectionDto[] => {
    return [...document.sections]
        .sort((a, b) => a.position - b.position)
        .map(section => {
            const lines = document.lines
                .filter(line => line.section_id === section.id)
                .sort((a, b) => a.position - b.position)
                .map(line => ({
                    label: line.label,
                    quantity: line.quantity,
                    unit: line.unit,
                    unitPrice: line.unit_price,
                    total: lineTotal(line),
                }));
            return {
                title: section.title,
                description: section.description,
                lines,
                total: round2(lines.reduce((sum, line) => sum + line.total, 0)),
            };
        })
        // A section with every line archived (or none added yet) has
        // nothing to print - skip it rather than showing a bare heading.
        .filter(section => section.lines.length > 0);
};

// The client's own billing address - always their primary one (or their
// first, if none is marked primary), same rule document-form.ts's own
// read-only address block uses on the frontend. Never documents.address_id
// - that's a separate, independently-picked "Lieu/Bâtiment" (see
// invoice.dto.ts's resolveLocation), not necessarily the same address at all.
export const resolveBillingAddress = (client: ClientWithAddresses) => {
    return client.addresses.find(a => a.is_primary) ?? client.addresses[0];
};

export const buildCompanyDto = (company: Company): CompanyDto => ({
    name: company.name ?? "",
    street: company.street ?? "",
    city: company.city ?? "",
    postalCodeCity: `${company.postal_code ?? ""} ${company.city ?? ""}`,
    logo: company.logo,
});

// A document made out to the "Non défini" placeholder client prints the
// recipient typed by hand on it instead (see document.service.ts's
// resolveRecipient) - the placeholder itself has no name or address worth
// printing.
export const hasTypedRecipient = (client: ClientWithAddresses, document: DocumentRecipient): boolean =>
    client.is_placeholder && !!document.recipient_name;

// What an invoice and a quote print alike (see business-letter.ts) - each
// DTO adds its own fields on top. The introduction/conclusion have their
// {{...}} placeholders filled in already.
export const buildLetterDto = (
    document: DocumentComplete,
    client: ClientWithAddresses,
    company: Company,
    language: PdfLanguage
): LetterDto => {
    const placeholders = buildDocumentValues(document, client.title, company.name, language);
    const typedRecipient = hasTypedRecipient(client, document);
    return {
        language,
        number: document.number,
        date: document.date,
        company: {
            ...buildCompanyDto(company),
            vatNumber: company.vat_number,
            email: company.email,
            phone: company.phone,
            iban: company.iban,
            website: company.website,
            bankName: company.bank_name,
            bankAccount: company.bank_account,
        },
        client: {
            ...buildClientDto(client, document),
            number: typedRecipient ? null : client.client_number,
            // "Monsieur" above "Jean Dupont" is an address line; a company's
            // title is a greeting ("Madame, Monsieur", "Dear Sir/Madam" - its
            // {{titre_client}}), not something to print above its name.
            title: typedRecipient || client.type !== "INDIVIDUAL" ? null : client.title,
        },
        referenceClient: document.reference_client,
        sections: buildSections(document),
        amountExclVat: document.amount_excl_vat,
        amountInclVat: document.amount_incl_vat,
        vatRate: document.vat_rate,
        discount: document.discount,
        introduction: fillPlaceholders(document.introduction ?? "", placeholders),
        conclusion: fillPlaceholders(document.conclusion ?? "", placeholders),
    };
};

export const buildClientDto = (client: ClientWithAddresses, document: DocumentRecipient): ClientDto => {
    if (hasTypedRecipient(client, document)) {
        return {
            name: document.recipient_name ?? "",
            complement: document.recipient_complement,
            street: document.recipient_street ?? "",
            city: document.recipient_city ?? "",
            postalCodeCity: `${document.recipient_postal_code ?? ""} ${document.recipient_city ?? ""}`.trim(),
        };
    }
    const address = resolveBillingAddress(client);
    return {
        name: clientDisplayName(client),
        street: address ? `${address.street}` : "",
        city: address?.city ?? "",
        postalCodeCity: address ? `${address.postal_code ?? ""} ${address.city ?? ""}` : "",
    };
};
