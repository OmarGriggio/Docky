import { PDFParse } from "pdf-parse";

// Only digital PDFs (a real text layer) are supported for now - a scanned/
// photographed document would need OCR first, deliberately out of scope
// until the need for it actually comes up (see zz_docs/Decisions.md).
export const extractTextFromPdf = async (pdfBuffer: Buffer): Promise<string> => {
    const parser = new PDFParse({ data: pdfBuffer });
    try {
        const result = await parser.getText();
        return result.text;
    } finally {
        await parser.destroy();
    }
};
