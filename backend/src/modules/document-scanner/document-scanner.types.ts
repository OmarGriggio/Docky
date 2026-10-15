export type ExtractionConfidence = "high" | "medium" | "low";

export interface ExtractedDocumentData {
    reference_client: string | null;
    project_name: string | null;
    address: {
        street: string | null;
        postal_code: string | null;
        city: string | null;
    } | null;
    description: string | null;
    due_date: string | null;
    estimated_amount: number | null;
    client_name_guess: string | null;
    confidence: ExtractionConfidence;
}
