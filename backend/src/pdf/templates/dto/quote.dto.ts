import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { QuoteDto } from "../quote.types";
import { fillPlaceholders } from "../placeholders";
import { buildDocumentValues } from "../document.placeholders";
import { toPdfLanguage } from "../pdf-labels";
import { buildClientDto, buildCompanyDto, buildSections } from "./shared";

export const createQuoteDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company): QuoteDto => {
    const language = toPdfLanguage(client.language);
    // {{titre_client}}/{{date}}/{{montant}}/{{signature_entreprise}} in the introduction/conclusion.
    const placeholders = buildDocumentValues(document, client.title, company.name, language);

    return {
        language,
        number: document.number,
        date: document.date,
        validUntil: document.due_date,
        company: buildCompanyDto(company),
        client: buildClientDto(client, document),
        sections: buildSections(document),
        amountExclVat: document.amount_excl_vat,
        amountInclVat: document.amount_incl_vat,
        vatRate: document.vat_rate,
        discount: document.discount,
        introduction: fillPlaceholders(document.introduction ?? "", placeholders),
        conclusion: fillPlaceholders(document.conclusion ?? "", placeholders),
        paymentTerms: company.payment_terms,
    };
}
