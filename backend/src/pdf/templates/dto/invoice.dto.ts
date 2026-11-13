import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { computeEarlyPayment } from "../../../modules/documents/document.calculations";
import { InvoiceDto } from "../invoice.types";
import { PDF_LABELS, toPdfLanguage } from "../pdf-labels";
import { buildPaymentScale, daysUntilDue } from "../payment-scale";
import { buildLetterDto } from "./shared";
import { billedAddressOf, formatLocation } from "../../../modules/documents/billed-address";
import { DepositDeduction } from "../../../modules/documents/document.types";
import { formatShortDate } from "../format";

// `deductions`/`amountDue`: a chantier's final invoice's deposits and what's
// left to pay (see deposit.ts) - none and the whole total for any other.
export const createInvoiceDto = (
    document: DocumentComplete,
    client: ClientWithAddresses,
    company: Company,
    deductions: DepositDeduction[] = [],
    due: number = document.amount_incl_vat
): InvoiceDto => {
    const days = document.early_payment_days;
    const earlyPayment = days
        // On what's left to pay - never on the deposits already invoiced.
        ? computeEarlyPayment(due, document.early_payment_discount, document.early_payment_min_amount)
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
        // Frozen with the rest of the address once sent (billed-address.ts) -
        // formatLocation for a typed-in recipient or an unfrozen client
        // without any address, which have no billed address.
        location: billedAddressOf(document, client)?.location ?? formatLocation(document, client),
        earlyPayment: days && earlyPayment ? { days, rate: document.early_payment_discount, ...earlyPayment } : null,
        dueDate: document.due_date,
        paymentTerms: document.payment_terms,
        paymentScale,
        invoiceKind: document.invoice_kind,
        deductions: deductions.map(deduction => ({
            label: PDF_LABELS[language].depositDeduction(deduction.number, formatShortDate(new Date(deduction.date))),
            amount: Number(deduction.amount_incl_vat),
        })),
        amountDue: due,
    };
}
