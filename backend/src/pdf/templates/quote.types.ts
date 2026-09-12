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
    client: {
        name: string;
        street: string;
        city: string;
        postalCodeCity: string;
        title: string;
    };
    sections: QuoteSectionDto[];
    amountExclVat: number;
    amountInclVat: number;
    introduction: string;
    conclusion: string;
}
