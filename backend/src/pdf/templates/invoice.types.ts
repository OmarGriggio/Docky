export interface InvoiceLineDto {
    label: string;
    quantity: number;
    unit: string | null;
    unitPrice: number;
}

export interface InvoiceDto {
    number: string;
    date: Date;
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
    lines: InvoiceLineDto[];
    amountExclVat: number;
    amountInclVat: number;
    introduction: string;
    conclusion: string;
}
