export interface QuoteLineDto {
    label: string;
    quantity: number;
    unit: string | null;
    unitPrice: number;
}

export interface QuoteSectionDto {
    title: string;
    description: string | null;
    lines: QuoteLineDto[];
}

export interface QuoteDto {
    number: string;
    date: Date;
    // documents.due_date doubles as "offer valid until" for a QUOTE (there's
    // no separate column for it) - null shows nothing rather than a bare
    // "-".
    validUntil: Date | null;
    company: {
        name: string;
        street: string;
        city: string;
        postalCodeCity: string;
        logo: string | null;
    };
    // Always the client's own billing address (primary, or its first one if
    // none is marked primary) - see quote.dto.ts's resolveBillingAddress. A
    // quote has no Lieu/Bâtiment concept (that's an invoice-only field).
    client: {
        name: string;
        street: string;
        city: string;
        postalCodeCity: string;
        title: string;
    };
    sections: QuoteSectionDto[];
    introduction: string;
    conclusion: string;
    // The company's own default payment terms (companies.payment_terms,
    // see company.types.ts) - a quote has no payment_terms of its own
    // (that's an invoice-only document field, set once accepted), shown
    // here purely so the client knows them upfront. Null if the company
    // hasn't set one.
    paymentTerms: string | null;
}
