import { Address } from "../../../modules/clients/address.types";
import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { computeEarlyPayment } from "../../../modules/documents/document.calculations";
import { InvoiceDto } from "../invoice.types";
import { toPdfLanguage } from "../pdf-labels";
import { buildLetterDto } from "./shared";

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
    const days = document.early_payment_days;
    const earlyPayment = days
        ? computeEarlyPayment(document.amount_incl_vat, document.early_payment_discount, document.early_payment_min_amount)
        : null;

    return {
        ...buildLetterDto(document, client, company, toPdfLanguage(client.language)),
        location: resolveLocation(document, client),
        earlyPayment: days && earlyPayment ? { days, rate: document.early_payment_discount, ...earlyPayment } : null,
        dueDate: document.due_date,
        paymentTerms: document.payment_terms,
    };
}
