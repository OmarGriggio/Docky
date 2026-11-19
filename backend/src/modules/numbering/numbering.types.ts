// What a company numbers its own way (Paramètres > Numérotation): its quotes
// and invoices, its clients and its resources - materials and services each
// their own series. A chantier's PROJECT document keeps the default
// CH-{YYYY}-{NNNN} (an internal number).
export type NumberedType = "QUOTE" | "INVOICE" | "CLIENT" | "MATERIAL" | "SERVICE";
export const NUMBERED_TYPES: NumberedType[] = ["QUOTE", "INVOICE", "CLIENT", "MATERIAL", "SERVICE"];

export interface Numbering {
    company_id: number;
    type: NumberedType;
    number_format: string;
    start_number: number | null;
    start_year: number | null;
}

export type NumberingSettings = Pick<Numbering, "number_format" | "start_number" | "start_year">;

// What Paramètres > Numérotation shows: the settings and the number the next
// document, client or resource would get.
export interface NumberingView {
    type: NumberedType;
    number_format: string;
    start_number: number | null;
    next_number: string;
}
