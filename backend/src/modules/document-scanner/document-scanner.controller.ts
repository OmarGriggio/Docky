import { Request, Response } from "express";
import { extractTextFromPdf } from "./document-scanner.pdf-text";

// Step 1 of the scanner pipeline - upload a PDF, get its raw text back.
// No LLM call yet (see document-scanner.pdf-text.ts's own comment on scope).
export const extractDocumentText = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: "Aucun fichier reçu" });
        return;
    }

    const text = await extractTextFromPdf(req.file.buffer);
    res.json({ text });
};
