import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { Template, TemplateStyle } from "../../../modules/templates/template.types";
import { quotePaymentTermsOf } from "../../../modules/templates/template.rules";
import { QuoteDto } from "../quote.types";
import { toPdfLanguage } from "../pdf-labels";
import { buildLetterDto } from "./shared";

// A quote has no payment terms of its own: its template's, frozen with its
// look once it's sent (quotePaymentTermsOf) - the conditions block and a
// text's {{conditions_paiement}} alike.
export const createQuoteDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company, style: TemplateStyle, template: Pick<Template, "payment_terms">): QuoteDto => {
    const paymentTerms = quotePaymentTermsOf(document.template_style, template);
    return {
        ...buildLetterDto({ ...document, payment_terms: paymentTerms }, client, company, style, toPdfLanguage(client.language)),
        validUntil: document.due_date,
        paymentTerms,
    };
};
