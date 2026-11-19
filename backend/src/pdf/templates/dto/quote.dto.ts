import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { Template, TemplateStyle } from "../../../modules/templates/template.types";
import { QuoteDto } from "../quote.types";
import { toPdfLanguage } from "../pdf-labels";
import { buildLetterDto } from "./shared";

// `template`'s payment terms: a quote has none of its own (its template's as they are now).
export const createQuoteDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company, style: TemplateStyle, template: Pick<Template, "payment_terms">): QuoteDto => ({
    ...buildLetterDto(document, client, company, style, toPdfLanguage(client.language)),
    validUntil: document.due_date,
    paymentTerms: template.payment_terms,
});
