import { ClientDto, CompanyDto, DocumentSectionDto } from "./document.types";
import { PdfLanguage } from "./pdf-labels";

export interface QuoteDto {
    language: PdfLanguage;
    number: string;
    date: Date;
    // documents.due_date doubles as "offer valid until" for a QUOTE (there's
    // no separate column for it) - null shows nothing rather than a bare
    // "-".
    validUntil: Date | null;
    company: CompanyDto;
    // Always the client's own billing address (primary, or its first one if
    // none is marked primary) - see dto/shared.ts's resolveBillingAddress. A
    // quote has no Lieu/Bâtiment concept (that's an invoice-only field).
    client: ClientDto;
    sections: DocumentSectionDto[];
    // The stored totals (documents.amount_excl_vat/amount_incl_vat), the same
    // figures the app shows and {{montant}} prints - never re-added here, so
    // what the client signs is exactly what later gets invoiced.
    amountExclVat: number;
    amountInclVat: number;
    vatRate: number;
    discount: number;
    introduction: string;
    conclusion: string;
    // The company's own default payment terms (companies.payment_terms,
    // see company.types.ts) - a quote has no payment_terms of its own
    // (that's an invoice-only document field, set once accepted), shown
    // here purely so the client knows them upfront. Null if the company
    // hasn't set one.
    paymentTerms: string | null;
}
