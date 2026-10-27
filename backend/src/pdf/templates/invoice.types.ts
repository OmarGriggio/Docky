import { LetterDto } from "./business-letter";

// The shared invoice/quote fields (business-letter.ts's LetterDto), plus an
// invoice's own.
export interface InvoiceDto extends LetterDto {
    // documents.address_id, formatted - null unless one was actually picked
    // (see resolveLocation in invoice.dto.ts). Distinct from client: where
    // the chantier/work itself is, not where the invoice is billed.
    location: string | null;
    // The early payment discount this invoice offers, already computed
    // (document.calculations.ts's computeEarlyPayment) - null when there's
    // none, or the total is under its minimum.
    earlyPayment: { days: number; rate: number; amount: number; net: number } | null;
    // documents.due_date - null shows nothing rather than a bare "-".
    dueDate: Date | null;
    paymentTerms: string | null;
}
