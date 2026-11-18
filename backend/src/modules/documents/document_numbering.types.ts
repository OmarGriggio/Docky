// The document types a company numbers its own way - a chantier's PROJECT
// document keeps the default CH-{YYYY}-{NNNN} (an internal number).
export type NumberedDocumentType = "QUOTE" | "INVOICE";
export const NUMBERED_DOCUMENT_TYPES: NumberedDocumentType[] = ["QUOTE", "INVOICE"];

export interface DocumentNumbering {
    company_id: number;
    type: NumberedDocumentType;
    number_format: string;
    start_number: number | null;
    start_year: number | null;
}

// What Paramètres > Numérotation shows: the settings and the number the next
// document would get.
export interface DocumentNumberingView {
    type: NumberedDocumentType;
    number_format: string;
    start_number: number | null;
    next_number: string;
}
