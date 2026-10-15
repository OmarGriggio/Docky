import { Request, Response } from "express";
import { extractTextFromPdf } from "./document-scanner.pdf-text";
import { scanDocumentServ } from "./document-scanner.service";

// Debugging endpoint - just the raw text, no LLM call. Kept around to
// isolate a bad extraction (pdf-parse) from a bad scan (the AI call) when
// something looks wrong on /extract.
export const extractDocumentText = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: "Aucun fichier reçu" });
        return;
    }

    const text = await extractTextFromPdf(req.file.buffer);
    res.json({ text });
};

// The real pipeline - upload a PDF, get structured fields back to prefill a
// form with (the frontend still shows them for review before saving
// anything).
export const scanDocument = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: "Aucun fichier reçu" });
        return;
    }

    const data = await scanDocumentServ(req.file.buffer);
    res.json(data);
};
