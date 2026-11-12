import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { computeEarlyPayment } from "../../../modules/documents/document.calculations";
import { InvoiceDto } from "../invoice.types";
import { PDF_LABELS, toPdfLanguage } from "../pdf-labels";
import { buildPaymentScale, daysUntilDue } from "../payment-scale";
import { buildLetterDto } from "./shared";
import { billedAddressOf, formatLocation } from "../../../modules/documents/billed-address";

export const createInvoiceDto = (document: DocumentComplete, client: ClientWithAddresses, company: Company): InvoiceDto => {
    const days = document.early_payment_days;
    const earlyPayment = days
        ? computeEarlyPayment(document.amount_incl_vat, document.early_payment_discount, document.early_payment_min_amount)
        : null;

    const language = toPdfLanguage(client.language);
    const paymentScale = buildPaymentScale(
        { rate: document.early_payment_discount, days, minAmount: document.early_payment_min_amount },
        daysUntilDue(document.date, document.due_date),
        earlyPayment !== null,
        PDF_LABELS[language]
    );

    return {
        ...buildLetterDto(document, client, company, language),
        // Frozen with the rest of the address once sent (billed-address.ts).
        location: billedAddressOf(document, client)?.location ?? formatLocation(document, client),
        earlyPayment: days && earlyPayment ? { days, rate: document.early_payment_discount, ...earlyPayment } : null,
        dueDate: document.due_date,
        paymentTerms: document.payment_terms,
        paymentScale,
    };
}
