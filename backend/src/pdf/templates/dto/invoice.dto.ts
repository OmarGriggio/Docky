import { Address } from "../../../modules/clients/address.types";
import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { InvoiceDto } from "../invoice.types";
import { fillPlaceholders } from "../placeholders";
import { buildDocumentValues } from "../document.placeholders";
import { toPdfLanguage } from "../pdf-labels";
import { buildClientDto, buildCompanyDto, buildSections } from "./shared";

// null unless documents.address_id was actually picked - same
// "Attention : Street, NPA City" shape as the frontend's own addressLabel
// (shared/utils/display.ts), duplicated here rather than shared across
// front/back (different languages, no shared package between them).
const resolveLocation = (document: DocumentComplete, client: ClientWithAddresses): string | null => {
    if (document.address_id === null) {
        return null;
    }
    const address: Address | undefined = client.addresses.find(a => a.id === document.address_id);
    if (!address) {
        return null;
    }

    const prefix = address.attention ? `${address.attention} : ` : "";
    return `${prefix}${address.street}, ${address.postal_code} ${address.city}`;
};

export const createInvoiceDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company): InvoiceDto => {
    const language = toPdfLanguage(client.language);
    // {{titre_client}}/{{date}}/{{montant}}/{{signature_entreprise}} in the introduction/conclusion.
    const placeholders = buildDocumentValues(document, client.title, company.name, language);

    return {
        language,
        number: document.number,
        date: document.date,
        company: {
            ...buildCompanyDto(company),
            vatNumber: company.vat_number,
        },
        client: buildClientDto(client, document),
        location: resolveLocation(document, client),
        referenceClient: document.reference_client,
        sections: buildSections(document),
        amountExclVat: document.amount_excl_vat,
        amountInclVat: document.amount_incl_vat,
        vatRate: document.vat_rate,
        discount: document.discount,
        dueDate: document.due_date,
        paymentTerms: document.payment_terms,
        introduction: fillPlaceholders(document.introduction ?? "", placeholders),
        conclusion: fillPlaceholders(document.conclusion ?? "", placeholders)
    };
}
