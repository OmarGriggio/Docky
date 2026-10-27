import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { QuoteDto } from "../quote.types";
import { toPdfLanguage } from "../pdf-labels";
import { buildLetterDto } from "./shared";

export const createQuoteDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company): QuoteDto => ({
    ...buildLetterDto(document, client, company, toPdfLanguage(client.language)),
    validUntil: document.due_date,
    paymentTerms: company.payment_terms,
});
