import { chatCompletionServ } from "../../shared/ai/infomaniak.service";
import { AppError } from "../../shared/types/errors";
import { extractTextFromPdf } from "./document-scanner.pdf-text";
import { EXTRACTION_SYSTEM_PROMPT } from "./document-scanner.prompt";
import { ExtractedDocumentData } from "./document-scanner.types";

// The handful of fields this feature extracts never needs more than a page
// or two of a real bon de commande/livraison - capping what's sent to the
// LLM bounds the cost of a single scan regardless of how long the uploaded
// PDF actually is (a 20-page file shouldn't mean a 20-page bill).
const MAX_TEXT_LENGTH = 8000;

export interface ScanResult {
    data: ExtractedDocumentData;
    truncated: boolean;
}

export const scanDocumentServ = async (pdfBuffer: Buffer): Promise<ScanResult> => {
    const fullText = await extractTextFromPdf(pdfBuffer);
    const truncated = fullText.length > MAX_TEXT_LENGTH;
    const text = truncated ? fullText.slice(0, MAX_TEXT_LENGTH) : fullText;

    const raw = await chatCompletionServ([
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: text },
    ]);

    return { data: parseExtractedData(raw), truncated };
};

// The result still goes through a review screen before anything is saved
// (see the frontend) - this only guards against a malformed/garbage
// response breaking that screen, not against a wrong-but-well-shaped guess.
const parseExtractedData = (raw: string): ExtractedDocumentData => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new AppError("The AI's response wasn't valid JSON", 502);
    }

    if (typeof parsed !== "object" || parsed === null) {
        throw new AppError("The AI's response wasn't a JSON object", 502);
    }

    const data = parsed as Record<string, unknown>;
    const confidence = data.confidence === "high" || data.confidence === "medium" || data.confidence === "low"
        ? data.confidence
        : "low";

    const address = typeof data.address === "object" && data.address !== null
        ? data.address as Record<string, unknown>
        : null;

    return {
        reference_client: nullableString(data.reference_client),
        project_name: nullableString(data.project_name),
        address: address ? {
            street: nullableString(address.street),
            postal_code: nullableString(address.postal_code),
            city: nullableString(address.city),
        } : null,
        description: nullableString(data.description),
        due_date: nullableString(data.due_date),
        estimated_amount: typeof data.estimated_amount === "number" ? data.estimated_amount : null,
        client_name_guess: nullableString(data.client_name_guess),
        confidence,
    };
};

const nullableString = (value: unknown): string | null => typeof value === "string" ? value : null;
