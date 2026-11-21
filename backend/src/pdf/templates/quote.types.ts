import { LetterDto } from "./business-letter";

// The shared invoice/quote fields (business-letter.ts's LetterDto), plus a
// quote's own.
export interface QuoteDto extends LetterDto {
    // documents.due_date doubles as "offer valid until" for a QUOTE (there's
    // no separate column for it) - null shows nothing rather than a bare
    // "-".
    validUntil: Date | null;
    // Its template's payment terms, frozen with its look once sent (dto/quote.dto.ts) -
    // shown so the client knows them upfront. Null if the template has none.
    paymentTerms: string | null;
}
