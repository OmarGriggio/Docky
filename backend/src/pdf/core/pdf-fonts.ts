import { readFile } from "fs/promises";
import path from "path";

// The fonts a template can print its documents in (templates.font).
// HELVETICA is one of the PDF standard fonts - nothing to embed, Latin-1
// only. The others are free fonts (SIL Open Font License, its text next to
// each one) embedded in the PDF, subset to the characters it uses - they
// cover far more than Latin-1.
export const FONT_FAMILIES = ["HELVETICA", "LATO", "PT_SERIF"] as const;
export type PdfFontFamily = typeof FONT_FAMILIES[number];

const FONT_FILES: Record<Exclude<PdfFontFamily, "HELVETICA">, { regular: string; bold: string }> = {
    LATO: { regular: "lato/Lato-Regular.ttf", bold: "lato/Lato-Bold.ttf" },
    PT_SERIF: { regular: "pt-serif/PT_Serif-Regular.ttf", bold: "pt-serif/PT_Serif-Bold.ttf" },
};

// backend/assets/fonts - the working directory is backend/ (npm scripts,
// tests) or /app (the containers, the prod image copying assets/ there).
const FONTS_DIR = path.resolve(process.cwd(), "assets", "fonts");

export const isFontFamily = (value: unknown): value is PdfFontFamily =>
    typeof value === "string" && (FONT_FAMILIES as readonly string[]).includes(value);

// Read once per family, then kept: a few hundred kB each, read on every PDF otherwise.
const cache = new Map<PdfFontFamily, Promise<{ regular: Buffer; bold: Buffer }>>();

export const readFontFiles = (family: Exclude<PdfFontFamily, "HELVETICA">): Promise<{ regular: Buffer; bold: Buffer }> => {
    let files = cache.get(family);
    if (!files) {
        const { regular, bold } = FONT_FILES[family];
        files = Promise.all([readFile(path.join(FONTS_DIR, regular)), readFile(path.join(FONTS_DIR, bold))])
            .then(([regularBytes, boldBytes]) => ({ regular: regularBytes, bold: boldBytes }));
        // A failed read isn't kept - the next PDF tries again.
        files.catch(() => cache.delete(family));
        cache.set(family, files);
    }
    return files;
};
