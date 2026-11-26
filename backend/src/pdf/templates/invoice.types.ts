import { LetterDto } from "./business-letter";
import { PaymentScaleRow } from "./payment-scale";
import { InvoiceKind } from "../../modules/documents/document.types";

// The shared invoice/quote fields (business-letter.ts's LetterDto), plus an
// invoice's own.
export interface InvoiceDto extends LetterDto {
    // documents.address_id, formatted - null unless one was actually picked
    // (see billed-address.ts's formatLocation). Distinct from client: where
    // the chantier/work itself is, not where the invoice is billed.
    location: string | null;
    // The early payment discount this invoice offers, already computed
    // (document.calculations.ts's computeEarlyPayment) - null when there's
    // none, or the total is under its minimum.
    earlyPayment: { days: number; rate: number; amount: number; net: number } | null;
    // documents.due_date - null shows nothing rather than a bare "-".
    dueDate: Date | null;
    // The date or period of the service it bills (documents.service_date_*,
    // art. 26 LTVA) - "01.10.2026" or "01.10.2026 – 15.10.2026", null: none given.
    servicePeriod: { single: boolean; value: string } | null;
    paymentTerms: string | null;
    // The early payment discount's scale under the payment conditions (see
    // payment-scale.ts) - empty without one.
    paymentScale: PaymentScaleRow[];
    // A chantier's deposit invoice is titled "FACTURE D'ACOMPTE" (see deposit.ts).
    invoiceKind: InvoiceKind;
}
