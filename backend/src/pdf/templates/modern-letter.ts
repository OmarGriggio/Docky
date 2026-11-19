import { PdfWriter } from "../core/pdf-writer";
import { PdfColor, PdfTextOptions } from "../core/pdf-writer.types";
import { LetterDto, documentColorsOf, vatLabelOf } from "./business-letter";
import { PDF_LABELS } from "./pdf-labels";
import { embedImage } from "./letter";
import { formatAmount, formatPercent, formatShortDate } from "./format";
import { textColorOn, tint } from "./accent-color";
import { DocumentLineDto, DocumentSectionDto } from "./document.types";

// The MODERN layout of invoices, quotes and reminders (companies.
// document_layout - business-letter.ts is the CLASSIC one): the logo top
// left and the company's details top right, the client's address on the
// left (a window envelope's left window) with the document's date, number
// and references in a column on the right, then every line of every section
// in one table on page 1 - no page of positions, no details page - its
// header row filled with the company's main color (repeated on each page
// it runs onto), every other row shaded, each section closed by its total.
// The totals in a box on the right. Same header image, footer, conclusion
// and payment conditions as the classic layout (business-letter.ts).

const RIGHT = 545;
// The right-hand column: the document's details next to the address, the
// totals box under the table.
const INFO_X = 350;
const BOX_LEFT = 330;
// Right edges of the table's number columns, the description wrapping
// before the quantity.
const QTY_RIGHT = 385;
const PRICE_RIGHT = 465;
const CELL_PADDING = 6;
const DESCRIPTION_WIDTH = QTY_RIGHT - 70 - 50 - CELL_PADDING;

const LOGO_MAX_WIDTH = 140;
const LOGO_MAX_HEIGHT = 60;

const GRAY: PdfColor = { r: 0.4, g: 0.4, b: 0.4 };
const LIGHT_GRAY: PdfColor = { r: 0.8, g: 0.8, b: 0.8 };
const ZEBRA: PdfColor = { r: 0.965, g: 0.965, b: 0.965 };
const DARK: PdfColor = { r: 0.17, g: 0.17, b: 0.17 };
const TOTAL_GRAY: PdfColor = { r: 0.9, g: 0.9, b: 0.9 };

const TABLE_HEADER_HEIGHT = 20;
const LINE_HEIGHT = 12;
const BOX_ROW = 17;
const BOX_BAND_ROW = 22;

/** Page 1 down to the introduction: who, to whom, when - then the title ("FACTURE N° FAC-2026-0012"). `info`: the document's own details in the right-hand column under the date and client number (a due date, a Lieu/Bâtiment...). */
export const drawModernHead = async (
    pdf: PdfWriter,
    letter: LetterDto,
    { title, logoBytes, hasHeaderImage, info = [] }: {
        title: string;
        logoBytes: Buffer | null;
        hasHeaderImage: boolean;
        info?: { label: string; value: string }[];
    }
) => {
    const labels = PDF_LABELS[letter.language];
    const left = pdf.marginValue();
    const company = letter.company;
    const top = pdf.remainingHeight();
    let bottom = top;

    if (logoBytes) {
        const image = await embedImage(pdf, logoBytes);
        if (image) {
            const scale = Math.min(LOGO_MAX_WIDTH / image.width, LOGO_MAX_HEIGHT / image.height, 1);
            pdf.drawImage(image, left, top - image.height * scale, image.width * scale, image.height * scale);
            bottom = Math.min(bottom, top - image.height * scale);
        }
    }

    // The header image usually carries the company's name and address
    // already - its details only without one.
    if (!hasHeaderImage) {
        const nameOptions: PdfTextOptions = { size: 13, bold: true, ...(company.secondaryColor ? { color: company.secondaryColor } : {}) };
        pdf.drawTextRightAt(company.name, RIGHT, top - 13, nameOptions);
        const details = [company.street, company.postalCodeCity.trim(), company.phone, company.email].filter((line): line is string => !!line);
        details.forEach((line, index) => pdf.drawTextRightAt(line, RIGHT, top - 28 - index * 12, { size: 9, color: GRAY }));
        bottom = Math.min(bottom, top - 28 - details.length * 12);
    }
    if (bottom < top) {
        pdf.lowerCursorTo(bottom - 30);
    }

    // The address on the left, the document's details on the right.
    const client = letter.client;
    const addressOptions: PdfTextOptions = { size: 11 };
    const addressLines = [client.title, client.name, client.complement, client.street, client.postalCodeCity]
        .filter((line): line is string => !!line)
        .flatMap(line => pdf.wrapLines(line, INFO_X - left - 20, addressOptions));
    const rows = [
        { label: labels.date.replace(/\s*:\s*$/, ""), value: formatShortDate(letter.date) },
        ...(client.number ? [{ label: labels.clientNumber, value: client.number }] : []),
        ...(letter.referenceClient ? [{ label: labels.reference, value: letter.referenceClient }] : []),
        ...info,
    ];
    const blockTop = pdf.remainingHeight();
    addressLines.forEach((line, index) => pdf.drawTextAt(line, left, blockTop - 11 - index * 15, addressOptions));
    rows.forEach(({ label, value }, index) => {
        const y = blockTop - 11 - index * 15;
        pdf.drawTextAt(label, INFO_X, y, { size: 9, color: GRAY });
        pdf.drawTextRightAt(value, RIGHT, y, { size: 9.5 });
    });
    pdf.lowerCursorTo(blockTop - Math.max(addressLines.length, rows.length) * 15 - 30);

    // The title, large, in the secondary color if there's one.
    const titleOptions: PdfTextOptions = { size: 18, bold: true, ...(company.secondaryColor ? { color: company.secondaryColor } : {}) };
    pdf.reserve(40);
    pdf.drawTextAt(title, left, pdf.remainingHeight() - 18, titleOptions);
    pdf.moveDown(44);

    if (letter.introduction.length > 0) {
        pdf.richText(letter.introduction, documentColorsOf(letter), { size: 10.5, marginBottom: 16 });
    }
};

/** Every section and its lines in one table, each section closed by its total. */
export const drawModernItems = (pdf: PdfWriter, letter: LetterDto) => {
    const labels = PDF_LABELS[letter.language];
    const left = pdf.marginValue();
    const headerColor = letter.company.accentColor ?? DARK;

    const drawHeader = () => {
        pdf.reserve(TABLE_HEADER_HEIGHT + 40);
        const top = pdf.remainingHeight();
        pdf.drawRect(left, top - TABLE_HEADER_HEIGHT, RIGHT - left, TABLE_HEADER_HEIGHT, headerColor);
        const options: PdfTextOptions = { size: 9, bold: true, color: textColorOn(headerColor) };
        const y = top - 13.5;
        pdf.drawTextAt(labels.description, left + CELL_PADDING, y, options);
        pdf.drawTextRightAt(labels.quantity, QTY_RIGHT, y, options);
        pdf.drawTextRightAt(labels.price, PRICE_RIGHT, y, options);
        pdf.drawTextRightAt(labels.total, RIGHT - CELL_PADDING, y, options);
        pdf.moveDown(TABLE_HEADER_HEIGHT + 4);
    };

    // Room for `height`, on the next page under a repeated header if it
    // doesn't fit on this one.
    const reserveRow = (height: number) => {
        const pages = pdf.pageCount();
        pdf.reserve(height);
        if (pdf.pageCount() !== pages) {
            drawHeader();
        }
    };

    drawHeader();
    letter.sections.forEach((section, index) => {
        drawSectionTitle(pdf, section, labels.position(index + 1), letter.company.secondaryColor, reserveRow);
        section.lines.forEach((line, lineIndex) => drawLine(pdf, line, lineIndex % 2 === 1, reserveRow));
        drawSectionTotal(pdf, `${labels.total} ${labels.position(index + 1)}`, section.total, reserveRow);
    });
    pdf.moveDown(10);
};

// "Pos 1 – Démolition" and its description, kept with the room of its first line.
const drawSectionTitle = (
    pdf: PdfWriter,
    section: DocumentSectionDto,
    position: string,
    color: PdfColor | null,
    reserveRow: (height: number) => void,
) => {
    const left = pdf.marginValue();
    const titleOptions: PdfTextOptions = { size: 10.5, bold: true, ...(color ? { color } : {}) };
    const descriptionOptions: PdfTextOptions = { size: 8.5, color: GRAY };
    const descriptionLines = section.description ? pdf.wrapLines(section.description, RIGHT - left - CELL_PADDING * 2, descriptionOptions) : [];
    const height = 18 + descriptionLines.length * 11;
    reserveRow(height + LINE_HEIGHT + 6);
    const top = pdf.remainingHeight();
    pdf.drawTextAt(`${position} – ${section.title}`, left + CELL_PADDING, top - 13, titleOptions);
    descriptionLines.forEach((line, index) => pdf.drawTextAt(line, left + CELL_PADDING, top - 25 - index * 11, descriptionOptions));
    pdf.moveDown(height + 2);
};

const drawLine = (pdf: PdfWriter, line: DocumentLineDto, shaded: boolean, reserveRow: (height: number) => void) => {
    const left = pdf.marginValue();
    const options: PdfTextOptions = { size: 9.5 };
    const labelLines = pdf.wrapLines(line.label, DESCRIPTION_WIDTH, options);
    const height = labelLines.length * LINE_HEIGHT + 6;
    reserveRow(height);
    const top = pdf.remainingHeight();
    if (shaded) {
        pdf.drawRect(left, top - height, RIGHT - left, height, ZEBRA);
    }
    const y = top - LINE_HEIGHT + 1;
    labelLines.forEach((text, index) => pdf.drawTextAt(text, left + CELL_PADDING + 10, y - index * LINE_HEIGHT, options));
    pdf.drawTextRightAt(line.unit ? `${line.quantity} ${line.unit}` : `${line.quantity}`, QTY_RIGHT, y, options);
    pdf.drawTextRightAt(formatAmount(line.unitPrice), PRICE_RIGHT, y, options);
    pdf.drawTextRightAt(formatAmount(line.total), RIGHT - CELL_PADDING, y, options);
    pdf.moveDown(height);
};

const drawSectionTotal = (pdf: PdfWriter, label: string, total: number, reserveRow: (height: number) => void) => {
    reserveRow(22);
    const top = pdf.remainingHeight();
    pdf.drawLineAt({ x: QTY_RIGHT + 10, y: top - 2 }, { x: RIGHT, y: top - 2 }, 0.5, LIGHT_GRAY);
    const options: PdfTextOptions = { size: 9.5, bold: true };
    pdf.drawTextRightAt(label, PRICE_RIGHT, top - 14, { ...options, color: GRAY });
    pdf.drawTextRightAt(formatAmount(total), RIGHT - CELL_PADDING, top - 14, options);
    pdf.moveDown(26);
};

interface BoxRow {
    label: string;
    value: number;
    // "total": the amount owed, on a band of the main color (gray without
    // one); "early": the early payment line, on a lighter one.
    band?: "total" | "early";
}

/** The totals in a box on the right, kept in one piece: the sections' sum, the discount, the VAT, the total on a band - then a final invoice's deposits and its balance, and an invoice's early payment discount. */
export const drawModernTotals = (
    pdf: PdfWriter,
    letter: LetterDto,
    earlyPayment: { days: number; rate: number; amount: number; net: number } | null = null
) => {
    const labels = PDF_LABELS[letter.language];
    const subtotal = letter.sections.reduce((sum, section) => sum + section.total, 0);
    const rows: BoxRow[] = [];
    if (letter.discount > 0 || letter.vatRate > 0) {
        rows.push({ label: labels.total, value: subtotal });
    }
    if (letter.discount > 0) {
        rows.push({ label: `${labels.discount} ${formatPercent(letter.discount)}`, value: letter.amountExclVat - subtotal });
    }
    if (letter.vatRate > 0) {
        // The VAT number goes under the box - too long for its column.
        rows.push({ label: `${labels.vat} ${formatPercent(letter.vatRate)}`, value: letter.amountInclVat - letter.amountExclVat });
    }
    rows.push({ label: labels.total.toUpperCase(), value: letter.amountInclVat, band: "total" });
    if (letter.deductions?.length && letter.amountDue !== undefined) {
        for (const deduction of letter.deductions) {
            rows.push({ label: deduction.label, value: -deduction.amount });
        }
        rows.push({ label: letter.amountDue >= 0 ? labels.amountDue : labels.creditBalance, value: Math.abs(letter.amountDue), band: "total" });
    }
    if (earlyPayment) {
        rows.push({ label: `${labels.earlyPayment(earlyPayment.days)} ${formatPercent(earlyPayment.rate)}`, value: earlyPayment.net, band: "early" });
    }

    const accent = letter.company.accentColor;
    const bands = {
        total: accent ? tint(accent, 0.22) : TOTAL_GRAY,
        early: accent ? tint(accent, 0.1) : ZEBRA,
    };
    const labelX = BOX_LEFT + 10;
    const valueRight = RIGHT - 10;
    const labelWidth = valueRight - labelX - 75;
    const optionsOf = (row: BoxRow): PdfTextOptions => (row.band === "total" ? { size: 11.5, bold: true } : { size: 9.5, bold: row.band === "early" });
    // A label too long for its column (a deposit's, the early payment's)
    // wraps, its amount on the first line.
    const laidOut = rows.map(row => {
        const options = optionsOf(row);
        const lines = pdf.wrapLines(row.label, labelWidth, options);
        const height = Math.max(row.band ? BOX_BAND_ROW : BOX_ROW, lines.length * 11 + 7);
        return { row, options, lines, height };
    });
    const vatNumberLine = letter.vatRate > 0 && letter.company.vatNumber ? vatLabelOf(letter) : null;
    const height = laidOut.reduce((sum, item) => sum + item.height, 0) + 12;

    pdf.reserve(height + (vatNumberLine ? 22 : 10));
    const top = pdf.remainingHeight();
    let y = top - 6;
    for (const { row, options, lines, height: rowHeightValue } of laidOut) {
        const rowTop = y;
        if (row.band) {
            pdf.drawRect(BOX_LEFT, rowTop - rowHeightValue, RIGHT - BOX_LEFT, rowHeightValue, bands[row.band]);
        }
        const firstBaseline = lines.length > 1 ? rowTop - 11 : rowTop - rowHeightValue / 2 - (options.size ?? 10) / 2 + 2;
        lines.forEach((line, index) => pdf.drawTextAt(line, labelX, firstBaseline - index * 11, options));
        pdf.drawTextRightAt(formatAmount(row.value), valueRight, firstBaseline, options);
        y -= rowHeightValue;
    }
    // The box's frame.
    const boxBottom = top - height;
    pdf.drawLineAt({ x: BOX_LEFT, y: top }, { x: RIGHT, y: top }, 0.6, LIGHT_GRAY);
    pdf.drawLineAt({ x: BOX_LEFT, y: boxBottom }, { x: RIGHT, y: boxBottom }, 0.6, LIGHT_GRAY);
    pdf.drawLineAt({ x: BOX_LEFT, y: top }, { x: BOX_LEFT, y: boxBottom }, 0.6, LIGHT_GRAY);
    pdf.drawLineAt({ x: RIGHT, y: top }, { x: RIGHT, y: boxBottom }, 0.6, LIGHT_GRAY);
    if (vatNumberLine) {
        pdf.drawTextRightAt(vatNumberLine, RIGHT, boxBottom - 11, { size: 8, color: GRAY });
    }
    pdf.lowerCursorTo(boxBottom - (vatNumberLine ? 28 : 16));
};
