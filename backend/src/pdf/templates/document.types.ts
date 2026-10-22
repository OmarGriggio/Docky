// What invoices and quotes share: their sections and lines, in the order
// they're printed, each total already computed (see dto/shared.ts) so the
// templates only draw.
export interface DocumentLineDto {
    label: string;
    quantity: number;
    unit: string | null;
    unitPrice: number;
    // Its own discount% applied - see document.calculations.ts's lineTotal.
    total: number;
}

export interface DocumentSectionDto {
    title: string;
    description: string | null;
    lines: DocumentLineDto[];
    total: number;
}

// Shared by every letter-like PDF (invoice, quote, reminder): the company's
// own header block.
export interface CompanyDto {
    name: string;
    street: string;
    city: string;
    postalCodeCity: string;
    logo: string | null;
}

// The client's own billing address - see dto/shared.ts's resolveBillingAddress.
export interface ClientDto {
    name: string;
    street: string;
    city: string;
    postalCodeCity: string;
}
