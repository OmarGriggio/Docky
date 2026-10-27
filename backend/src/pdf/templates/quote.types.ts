import { LetterDto } from "./business-letter";

// The shared invoice/quote fields (business-letter.ts's LetterDto), plus a
// quote's own.
export interface QuoteDto extends LetterDto {
    // documents.due_date doubles as "offer valid until" for a QUOTE (there's
    // no separate column for it) - null shows nothing rather than a bare
    // "-".
    validUntil: Date | null;
    // The company's own default payment terms (companies.payment_terms,
    // see company.types.ts) - a quote has no payment_terms of its own
    // (that's an invoice-only document field, set once accepted), shown
    // here purely so the client knows them upfront. Null if the company
    // hasn't set one.
    paymentTerms: string | null;
}
