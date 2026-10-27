import { PDFImage } from "pdf-lib";
import { PdfWriter } from "../core/pdf-writer";
import { PdfTable } from "../core/pdf-writer.types";
import { ClientDto, CompanyDto, DocumentSectionDto } from "./document.types";
import { formatLongDate, PDF_LABELS, PdfLanguage } from "./pdf-labels";

// Drawing steps shared by every letter-like PDF (invoice, quote, reminder),
// so each template only draws what's its own.

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

/** Draws the company's document header image (already embedded - once per PDF, drawn on every page of an invoice or quote, see business-letter.ts) at the top of the page, sized to fit within the default top margin (never taller than it), centered horizontally - an absolute position, entirely independent of the flowing cursor. `topGap`: points left free above it, the page's top edge being otherwise flush against it. */
export const placeHeaderImage = (pdf: PdfWriter, image: PDFImage, topGap = 0) => {
    const margin = pdf.marginValue();
    const maxWidth = pdf.pageWidth() - margin * 2;
    const scale = Math.min(maxWidth / image.width, margin / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (pdf.pageWidth() - width) / 2;
    const y = pdf.pageHeight() - topGap - height;

    pdf.drawImage(image, x, y, width, height, IMAGE_OPACITY);
};

// Company address (left) and logo (right), side by side - drawn
// independently (the logo via an absolute position, not the flowing cursor),
// then the cursor is lowered past whichever of the two ends up taller. Then
// the client's address and the place/date line, both indented to the right.
// `companyExtraLines` go right under the company's own address (the
// invoice's VAT number).
export const drawLetterHead = async (
    pdf: PdfWriter,
    { company, client, date, language, logoBytes, companyExtraLines = [], dateMarginBottom = 15 }: {
        company: CompanyDto;
        client: ClientDto;
        date: Date;
        language: PdfLanguage;
        logoBytes: Buffer | null;
        companyExtraLines?: string[];
        dateMarginBottom?: number;
    }
) => {
    const topY = pdf.remainingHeight();
    pdf.text(company.name, { bold: true });
    pdf.text(company.street);
    pdf.text(company.postalCodeCity);
    for (const line of companyExtraLines) {
        pdf.text(line);
    }

    if (logoBytes) {
        const logoBottomY = await drawLogoTopRight(pdf, logoBytes, topY);
        pdf.lowerCursorTo(logoBottomY);
    }
    pdf.lowerCursorTo(pdf.remainingHeight() - 20);

    pdf.text(client.name, { bold: true, indent: 250 });
    if (client.complement) {
        pdf.text(client.complement, { indent: 250 });
    }
    pdf.text(client.street, { indent: 250 });
    pdf.text(client.postalCodeCity, { indent: 250, marginBottom: 15 });

    const placeDate = PDF_LABELS[language].placeDate(company.city, formatLongDate(date, language));
    pdf.text(placeDate, { marginBottom: dateMarginBottom, indent: 250 });
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
    { numbered = false, sectionGap = 0 }: { numbered?: boolean; sectionGap?: number } = {}
) => {
    const labels = PDF_LABELS[language];

    pdf.text(heading, { bold: true, marginBottom: 15 });

    for (const [index, section] of sections.entries()) {
        if (index > 0) {
            pdf.moveDown(sectionGap);
        }
        const title = numbered ? `${labels.position(index + 1)} – ${section.title}` : section.title;
        pdf.text(title, { bold: true, size: 12, marginTop: 10, marginBottom: section.description ? 2 : 4 });
        if (section.description) {
            pdf.text(section.description, { size: 10, marginBottom: 4 });
        }
        pdf.table(createSectionTable(section, language));
        pdf.text(`${labels.total} ${section.title} : ${section.total.toFixed(2)} CHF`, { bold: true, marginTop: 4 });
    }
};

const createSectionTable = (section: DocumentSectionDto, language: PdfLanguage): PdfTable => {
    const labels = PDF_LABELS[language];
    return {
        columns: [
            { key: "description", title: labels.description, width: 260 },
            { key: "quantity", title: labels.quantity, width: 60 },
            { key: "price", title: labels.price, width: 80 },
            { key: "total", title: labels.total, width: 80 },
        ],
        rows: section.lines.map(line => ({
            description: line.label,
            quantity: line.unit ? `${line.quantity} ${line.unit}` : `${line.quantity}`,
            price: `${line.unitPrice.toFixed(2)} CHF`,
            total: `${line.total.toFixed(2)} CHF`,
        })),
    };
};
