import { PDFImage } from "pdf-lib";
import { PdfWriter } from "../core/pdf-writer";
import { PdfColor, PdfTable } from "../core/pdf-writer.types";
import { DocumentSectionDto } from "./document.types";
import { PDF_LABELS, PdfLanguage } from "./pdf-labels";
import { formatAmount } from "./format";

// Drawing steps shared by the letter-like PDFs: the logo, the header image
// and the itemized section details (used by business-letter.ts, the
// invoice/quote/reminder layout).

const LOGO_MAX_WIDTH = 120;
const LOGO_MAX_HEIGHT = 60;
// Applied to the logo and the header image - a soft watermark-like look
// rather than flat, opaque artwork.
const IMAGE_OPACITY = 0.65;

/** The image file may be a JPEG or a PNG; try both embedders rather than trusting the file extension. */
export const embedImage = async (pdf: PdfWriter, imageBytes: Buffer): Promise<PDFImage | null> => {
    try {
        return await pdf.embedJpg(imageBytes);
    } catch {
        try {
            return await pdf.embedPng(imageBytes);
        } catch {
            return null;
        }
    }
};

/** Draws the logo at the top-right corner (not centered) and returns the Y of its own bottom edge, so the caller can lower the flowing cursor past it. */
export const drawLogoTopRight = async (pdf: PdfWriter, logoBytes: Buffer, topY: number): Promise<number> => {
    const image = await embedImage(pdf, logoBytes);
    if (!image) return topY;

    const scale = Math.min(LOGO_MAX_WIDTH / image.width, LOGO_MAX_HEIGHT / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = pdf.pageWidth() - pdf.marginValue() - width;
    const y = topY - height;

    pdf.drawImage(image, x, y, width, height, IMAGE_OPACITY);
    return y;
};

/** Draws the company's document header image (already embedded - once per PDF, drawn on every page of an invoice or quote, see business-letter.ts) at the top of the page, scaled down to fit the page's width between its margins and `maxHeight` (never enlarged), centered horizontally - an absolute position, entirely independent of the flowing cursor. `topGap`: points left free above it, the page's top edge being otherwise flush against it. Returns the height it was drawn at. */
export const placeHeaderImage = (pdf: PdfWriter, image: PDFImage, topGap: number, maxHeight: number): number => {
    const maxWidth = pdf.pageWidth() - pdf.marginValue() * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (pdf.pageWidth() - width) / 2;
    const y = pdf.pageHeight() - topGap - height;

    pdf.drawImage(image, x, y, width, height, IMAGE_OPACITY);
    return height;
};

// The full itemized breakdown - every section's own lines, in a table, plus
// that section's own total. `heading` is repeated at the top (e.g. "Facture
// N° X — Client") so a page landed on mid-document still reads on its own.
// `numbered`: each section titled "Pos 1 – ..." like the invoice's page 1
// recap, so a reader finds a position there in the detail. `sectionGap`:
// extra space between one section and the next.
export const drawSectionDetails = (
    pdf: PdfWriter,
    heading: string,
    sections: DocumentSectionDto[],
    language: PdfLanguage,
    { numbered = false, sectionGap = 0, color = null }: { numbered?: boolean; sectionGap?: number; color?: PdfColor | null } = {}
) => {
    const labels = PDF_LABELS[language];
    // The heading and each section's title in `color`, when given.
    const titleColor = color ? { color } : {};

    pdf.text(heading, { bold: true, marginBottom: 15, ...titleColor });

    for (const [index, section] of sections.entries()) {
        if (index > 0) {
            pdf.moveDown(sectionGap);
        }
        const title = numbered ? `${labels.position(index + 1)} – ${section.title}` : section.title;
        pdf.text(title, { bold: true, size: 12, marginTop: 10, marginBottom: section.description ? 2 : 4, ...titleColor });
        if (section.description) {
            pdf.text(section.description, { size: 10, marginBottom: 4 });
        }
        pdf.table(createSectionTable(section, language));
        drawSectionTotal(pdf, `${labels.total} ${section.title} :`, formatAmount(section.total));
    }
};

// The table's right edge - where its amounts end (the page's text width).
const TABLE_RIGHT = 545;

// "Total Peinture :" on the left, its amount ending under the lines' totals -
// the label cut short ("…") rather than running into the amount.
const drawSectionTotal = (pdf: PdfWriter, label: string, amount: string) => {
    const options = { bold: true };
    const left = pdf.marginValue();
    const maxWidth = TABLE_RIGHT - pdf.textWidth(amount, options) - 12 - left;
    let text = label;
    while (text.length > 1 && pdf.textWidth(text, options) > maxWidth) {
        text = `${text.slice(0, -2)}…`;
    }
    pdf.moveDown(4);
    pdf.reserve(16);
    const y = pdf.remainingHeight();
    pdf.drawTextAt(text, left, y, options);
    pdf.drawTextRightAt(amount, TABLE_RIGHT, y, options);
    pdf.moveDown(16);
};

const createSectionTable = (section: DocumentSectionDto, language: PdfLanguage): PdfTable => {
    const labels = PDF_LABELS[language];
    return {
        columns: [
            // 495 in all: from the margin to TABLE_RIGHT.
            { key: "type", title: labels.lineType, width: 65 },
            { key: "description", title: labels.description, width: 205 },
            { key: "quantity", title: labels.quantity, width: 75 },
            { key: "price", title: labels.price, width: 70, align: "right" },
            { key: "total", title: labels.total, width: 80, align: "right" },
        ],
        // No currency on the lines - only ever on the total's (LetterDto.currency).
        rows: section.lines.map(line => ({
            description: line.label,
            type: labels.lineTypes[line.type],
            quantity: line.unit ? `${line.quantity} ${line.unit}` : `${line.quantity}`,
            price: formatAmount(line.unitPrice),
            total: formatAmount(line.total),
        })),
    };
};
