import { PdfWriter } from "../core/pdf-writer";
import { PdfColor, PdfTextOptions } from "../core/pdf-writer.types";
import { LetterDto, documentColorsOf } from "./business-letter";
import { PDF_LABELS } from "./pdf-labels";
import { embedImage } from "./letter";
import { formatAmount, formatShortDate } from "./format";
import { textColorOn, tint } from "./accent-color";
import { DocumentLineDto, DocumentSectionDto } from "./document.types";
import { BesideTotals } from "./modern-letter";
import { PaymentScaleRow } from "./payment-scale";
import { PrintColors } from "./element-colors";

// The BANNER layout of invoices, quotes and reminders (a template's layout -
// business-letter.ts is the CLASSIC one, modern-letter.ts the MODERN one): a
// band of the title's color across the top of page 1 - the logo and the
// company's name and address on the left, the document's kind and number on
// the right - the client's address on the right under it (a window
// envelope's right window), then every detail of the document in a framed
// grid (date, due date, client number, reference, service period, location),
// each section in a table of its own - a bar of its color before its title,
// its column titles on a light band repeated on each page it runs onto, its
// subtotal - and the totals in the modern layout's box. Its footer sits on a
// light band of the footer's color (business-letter.ts's drawLetterFooters).
// With a header image, the image stays at the top and the band under it
// carries the kind and number only - the image already says who.

const RIGHT = 545;
// The client's address: the right-hand window of a Swiss envelope.
const ADDRESS_X = 320;

const BAND_HEIGHT = 80;
const BAND_HEIGHT_TITLE_ONLY = 46;
const LOGO_MAX_WIDTH = 110;
const LOGO_MAX_HEIGHT = 46;
const LOGO_PADDING = 5;

const GRID_ROW = 31;
// Between two lines of a grid value too long for one.
const VALUE_LINE = 12;
const GRID_COLUMNS = 3;
const CELL_PADDING = 7;

// The lines' columns - the same as the modern layout's table.
const QTY_RIGHT = 385;
const PRICE_RIGHT = 465;
const TYPE_X = 56;
const DESCRIPTION_X = TYPE_X + 62;
const DESCRIPTION_WIDTH = QTY_RIGHT - 60 - DESCRIPTION_X;
const LINE_HEIGHT = 12;
const COLUMNS_HEIGHT = 18;

const GRAY: PdfColor = { r: 0.4, g: 0.4, b: 0.4 };
const LIGHT_GRAY: PdfColor = { r: 0.82, g: 0.82, b: 0.82 };
const RULE_GRAY: PdfColor = { r: 0.9, g: 0.9, b: 0.9 };
const DARK: PdfColor = { r: 0.17, g: 0.17, b: 0.17 };

export interface BannerDetail {
    label: string;
    value: string;
}

// The largest size from `size` down to `min` at which `text` fits `maxWidth`
// (cut with "…" at `min` if it still doesn't) - a long kind ("SECOND
// REMINDER", "MISE EN DEMEURE") or company name shrinks rather than overlapping.
const shrinkToFit = (pdf: PdfWriter, text: string, options: PdfTextOptions, min: number, maxWidth: number): [string, PdfTextOptions] => {
    let current = options;
    while ((current.size ?? 11) > min && pdf.textWidth(text, current) > maxWidth) {
        current = { ...current, size: Math.max(min, (current.size ?? 11) - 0.5) };
    }
    return [fit(pdf, text, maxWidth, current), current];
};

// The band's right-hand side, the kind and number, never more than this
// share of the width between the margins - the company keeps the rest.
const TITLE_SHARE = 0.42;

// Cut with "…" rather than running past `maxWidth`.
const fit = (pdf: PdfWriter, text: string, maxWidth: number, options: PdfTextOptions): string => {
    if (pdf.textWidth(text, options) <= maxWidth) {
        return text;
    }
    let cut = text;
    while (cut.length > 1 && pdf.textWidth(`${cut}…`, options) > maxWidth) {
        cut = cut.slice(0, -1);
    }
    return `${cut.trimEnd()}…`;
};

/** Page 1 down to the introduction: the band (who, what), the client's address, the document's details in a grid. `kind` ("FACTURE", "2E RAPPEL") and `number` ("N° FAC-2026-0012", "Facture N° FAC-...") on two lines in the band. `details`: the document's own after its date, client number and reference (a due date, a service period, a location...). */
export const drawBannerHead = async (
    pdf: PdfWriter,
    letter: LetterDto,
    { kind, number, logoBytes, hasHeaderImage, details = [] }: {
        kind: string;
        number: string;
        logoBytes: Buffer | null;
        hasHeaderImage: boolean;
        details?: BannerDetail[];
    }
) => {
    const labels = PDF_LABELS[letter.language];
    const left = pdf.marginValue();
    const company = letter.company;
    const bandColor = company.colors.title ?? DARK;
    const onBand = textColorOn(bandColor);

    // The band: across the whole page at its top, or under the header image
    // between the margins (the image already names the company).
    const bandHeight = hasHeaderImage ? BAND_HEIGHT_TITLE_ONLY : BAND_HEIGHT;
    const bandTop = hasHeaderImage ? pdf.remainingHeight() : pdf.pageHeight();
    const [bandLeft, bandRight] = hasHeaderImage ? [left, RIGHT] : [0, pdf.pageWidth()];
    pdf.drawRect(bandLeft, bandTop - bandHeight, bandRight - bandLeft, bandHeight, bandColor);

    // Without a header image the kind and number keep a share of the band,
    // the company the rest; under one they have the band to themselves.
    const titleMax = hasHeaderImage ? RIGHT - left - 24 : (RIGHT - left) * TITLE_SHARE;
    const [kindText, kindOptions] = shrinkToFit(pdf, kind, { size: hasHeaderImage ? 15 : 20, bold: true, color: onBand }, 12, titleMax);
    const [numberText, numberOptions] = shrinkToFit(pdf, number, { size: 10.5, color: onBand }, 8, titleMax);
    const textRight = hasHeaderImage ? RIGHT - 12 : RIGHT;
    const middle = bandTop - bandHeight / 2;
    pdf.drawTextRightAt(kindText, textRight, middle + 2, kindOptions);
    pdf.drawTextRightAt(numberText, textRight, middle - 14, numberOptions);

    if (!hasHeaderImage) {
        // The company's name and address stop short of the kind and number.
        const titleWidth = Math.max(pdf.textWidth(kindText, kindOptions), pdf.textWidth(numberText, numberOptions));
        const maxRight = RIGHT - titleWidth - 24;
        let x = left;
        if (logoBytes) {
            const image = await embedImage(pdf, logoBytes);
            if (image) {
                const scale = Math.min(LOGO_MAX_WIDTH / image.width, LOGO_MAX_HEIGHT / image.height, 1);
                const [width, height] = [image.width * scale, image.height * scale];
                // On a white tile: a logo is drawn for a white page.
                pdf.drawRect(x, middle - height / 2 - LOGO_PADDING, width + LOGO_PADDING * 2, height + LOGO_PADDING * 2, { r: 1, g: 1, b: 1 });
                pdf.drawImage(image, x + LOGO_PADDING, middle - height / 2, width, height);
                x += width + LOGO_PADDING * 2 + 14;
            }
        }
        const [nameText, nameOptions] = shrinkToFit(pdf, company.name, { size: 14, bold: true, color: onBand }, 10, maxRight - x);
        const detailOptions: PdfTextOptions = { size: 8.5, color: onBand };
        const lines = [company.street, company.postalCodeCity.trim(), [company.phone, company.email].filter(Boolean).join(" · ")]
            .filter((line): line is string => !!line);
        const blockHeight = 16 + lines.length * 11;
        let y = middle + blockHeight / 2 - 12;
        pdf.drawTextAt(nameText, x, y, nameOptions);
        y -= 17;
        for (const line of lines) {
            pdf.drawTextAt(fit(pdf, line, maxRight - x, detailOptions), x, y, detailOptions);
            y -= 11;
        }
    }
    pdf.lowerCursorTo(bandTop - bandHeight - 18);

    // The client's address on the right.
    const client = letter.client;
    const addressOptions: PdfTextOptions = { size: 11 };
    const addressLines = [client.title, client.name, client.complement, client.street, client.postalCodeCity]
        .filter((line): line is string => !!line)
        .flatMap(line => pdf.wrapLines(line, RIGHT - ADDRESS_X, addressOptions));
    const addressTop = pdf.remainingHeight();
    addressLines.forEach((line, index) => pdf.drawTextAt(line, ADDRESS_X, addressTop - 11 - index * 15, addressOptions));
    pdf.lowerCursorTo(addressTop - addressLines.length * 15 - 16);

    drawDetailsGrid(pdf, [
        { label: labels.date.replace(/\s*:\s*$/, ""), value: formatShortDate(letter.date) },
        ...(client.number ? [{ label: labels.clientNumber, value: client.number }] : []),
        ...(letter.referenceClient ? [{ label: labels.reference, value: letter.referenceClient }] : []),
        ...details,
    ]);

    if (letter.introduction.length > 0) {
        pdf.richText(letter.introduction, documentColorsOf(letter), { size: 10.5, marginBottom: 12 });
    }
};

// The document's details in a framed grid of three columns: a cell's label
// small and gray, its value under it. A value too wide for its cell takes
// two or three (the rest of the row left to it when nothing else fits), and
// wraps past the whole width - a long reference or location is never cut,
// a sent document has nowhere else to show it.
const drawDetailsGrid = (pdf: PdfWriter, details: BannerDetail[]) => {
    const left = pdf.marginValue();
    const columnWidth = (RIGHT - left) / GRID_COLUMNS;
    const labelOptions: PdfTextOptions = { size: 7.5, color: GRAY };
    const valueOptions: PdfTextOptions = { size: 10, bold: true };

    // Each detail's span, then laid out row by row.
    const rows: { detail: BannerDetail; span: number }[][] = [];
    let row: { detail: BannerDetail; span: number }[] = [];
    let used = 0;
    for (const detail of details) {
        const width = Math.max(pdf.textWidth(detail.value, valueOptions), pdf.textWidth(detail.label, labelOptions)) + CELL_PADDING * 2;
        const span = Math.min(GRID_COLUMNS, Math.ceil(width / columnWidth));
        if (used + span > GRID_COLUMNS) {
            rows.push(row);
            row = [];
            used = 0;
        }
        row.push({ detail, span });
        used += span;
    }
    if (row.length > 0) {
        rows.push(row);
    }
    // The last cell of a row takes what's left of it.
    for (const cells of rows) {
        const taken = cells.reduce((sum, cell) => sum + cell.span, 0);
        cells[cells.length - 1].span += GRID_COLUMNS - taken;
    }

    // Each value's lines, and each row's height from its tallest cell.
    const laidOut = rows.map(cells => {
        const withLines = cells.map(cell => ({ ...cell, lines: pdf.wrapLines(cell.detail.value, cell.span * columnWidth - CELL_PADDING * 2, valueOptions) }));
        return { cells: withLines, height: GRID_ROW + (Math.max(...withLines.map(cell => cell.lines.length)) - 1) * VALUE_LINE };
    });
    const height = laidOut.reduce((sum, item) => sum + item.height, 0);
    pdf.reserve(height + 20);
    const top = pdf.remainingHeight();
    let rowTop = top;
    laidOut.forEach(({ cells, height: rowHeight }, rowIndex) => {
        let column = 0;
        cells.forEach((cell, cellIndex) => {
            const x = left + column * columnWidth;
            const width = cell.span * columnWidth;
            if (cellIndex > 0) {
                pdf.drawLineAt({ x, y: rowTop }, { x, y: rowTop - rowHeight }, 0.5, LIGHT_GRAY);
            }
            pdf.drawTextAt(fit(pdf, cell.detail.label, width - CELL_PADDING * 2, labelOptions), x + CELL_PADDING, rowTop - 11, labelOptions);
            cell.lines.forEach((line, index) => pdf.drawTextAt(line, x + CELL_PADDING, rowTop - 24 - index * VALUE_LINE, valueOptions));
            column += cell.span;
        });
        if (rowIndex > 0) {
            pdf.drawLineAt({ x: left, y: rowTop }, { x: RIGHT, y: rowTop }, 0.5, LIGHT_GRAY);
        }
        rowTop -= rowHeight;
    });
    // The frame.
    const bottom = top - height;
    pdf.drawLineAt({ x: left, y: top }, { x: RIGHT, y: top }, 0.75, LIGHT_GRAY);
    pdf.drawLineAt({ x: left, y: bottom }, { x: RIGHT, y: bottom }, 0.75, LIGHT_GRAY);
    pdf.drawLineAt({ x: left, y: top }, { x: left, y: bottom }, 0.75, LIGHT_GRAY);
    pdf.drawLineAt({ x: RIGHT, y: top }, { x: RIGHT, y: bottom }, 0.75, LIGHT_GRAY);
    pdf.lowerCursorTo(bottom - 20);
};

/** Each section in a table of its own: its title after a bar of its color, its column titles, its lines, its subtotal. */
export const drawBannerItems = (pdf: PdfWriter, letter: LetterDto) => {
    const labels = PDF_LABELS[letter.language];
    const left = pdf.marginValue();
    const barColor = letter.company.colors.sectionTitles ?? DARK;
    const columnsColor = tint(letter.company.colors.tableHeader ?? DARK, 0.12);

    const drawColumns = () => {
        const top = pdf.remainingHeight();
        pdf.drawRect(left, top - COLUMNS_HEIGHT, RIGHT - left, COLUMNS_HEIGHT, columnsColor);
        const options: PdfTextOptions = { size: 8, bold: true, color: textColorOn(columnsColor) };
        const y = top - 12;
        pdf.drawTextAt(labels.lineType, TYPE_X, y, options);
        pdf.drawTextAt(labels.description, DESCRIPTION_X, y, options);
        pdf.drawTextRightAt(labels.quantity, QTY_RIGHT, y, options);
        pdf.drawTextRightAt(labels.price, PRICE_RIGHT, y, options);
        pdf.drawTextRightAt(labels.total, RIGHT - 6, y, options);
        pdf.moveDown(COLUMNS_HEIGHT + 3);
    };

    // Room for `height`, on the next page under the column titles again if
    // it doesn't fit on this one.
    const reserveRow = (height: number) => {
        const pages = pdf.pageCount();
        pdf.reserve(height);
        if (pdf.pageCount() !== pages) {
            drawColumns();
        }
    };

    letter.sections.forEach((section, index) => {
        drawSectionTitle(pdf, section, labels.position(index + 1), barColor, letter.company.colors.sectionTitles);
        drawColumns();
        section.lines.forEach(line => drawLine(pdf, line, labels.lineTypes[line.type], reserveRow));
        drawSubtotal(pdf, `${labels.subtotal} ${labels.position(index + 1)}`, section.total, reserveRow);
    });
    pdf.moveDown(4);
};

// "▌Pos 1 – Peinture" and its description - kept with its column titles and first line.
const drawSectionTitle = (pdf: PdfWriter, section: DocumentSectionDto, position: string, barColor: PdfColor, titleColor: PdfColor | null) => {
    const left = pdf.marginValue();
    const titleOptions: PdfTextOptions = { size: 11, bold: true, ...(titleColor ? { color: titleColor } : {}) };
    const descriptionOptions: PdfTextOptions = { size: 8.5, color: GRAY };
    // A long title wraps rather than being cut - there's no details page to show it whole.
    const titleLines = pdf.wrapLines(`${position} – ${section.title}`, RIGHT - left - 12, titleOptions);
    const descriptionLines = section.description ? pdf.wrapLines(section.description, RIGHT - left - 12, descriptionOptions) : [];
    const titleHeight = titleLines.length * 14;
    const height = 4 + titleHeight + descriptionLines.length * 11;
    pdf.reserve(height + COLUMNS_HEIGHT + LINE_HEIGHT + 12);
    const top = pdf.remainingHeight();
    pdf.drawRect(left, top - 2 - titleHeight, 3.5, titleHeight, barColor);
    titleLines.forEach((line, index) => pdf.drawTextAt(line, left + 10, top - 13 - index * 14, titleOptions));
    descriptionLines.forEach((line, index) => pdf.drawTextAt(line, left + 10, top - 12 - titleHeight - index * 11, descriptionOptions));
    pdf.moveDown(height + 4);
};

const drawLine = (pdf: PdfWriter, line: DocumentLineDto, typeLabel: string, reserveRow: (height: number) => void) => {
    const left = pdf.marginValue();
    const options: PdfTextOptions = { size: 9.5 };
    const labelLines = pdf.wrapLines(line.label, DESCRIPTION_WIDTH, options);
    const height = labelLines.length * LINE_HEIGHT + 7;
    reserveRow(height);
    const top = pdf.remainingHeight();
    const y = top - LINE_HEIGHT + 1;
    labelLines.forEach((text, index) => pdf.drawTextAt(text, DESCRIPTION_X, y - index * LINE_HEIGHT, options));
    pdf.drawTextAt(typeLabel, TYPE_X, y, { ...options, color: GRAY });
    pdf.drawTextRightAt(line.unit ? `${line.quantity} ${line.unit}` : `${line.quantity}`, QTY_RIGHT, y, options);
    pdf.drawTextRightAt(formatAmount(line.unitPrice), PRICE_RIGHT, y, options);
    pdf.drawTextRightAt(formatAmount(line.total), RIGHT - 6, y, options);
    pdf.drawLineAt({ x: left, y: top - height + 1 }, { x: RIGHT, y: top - height + 1 }, 0.4, RULE_GRAY);
    pdf.moveDown(height);
};

const drawSubtotal = (pdf: PdfWriter, label: string, total: number, reserveRow: (height: number) => void) => {
    reserveRow(22);
    const top = pdf.remainingHeight();
    const options: PdfTextOptions = { size: 9.5, bold: true };
    pdf.drawTextRightAt(label, PRICE_RIGHT, top - 13, { ...options, color: GRAY });
    pdf.drawTextRightAt(formatAmount(total), RIGHT - 6, top - 13, options);
    pdf.moveDown(24);
};

/** Behind the footer of every numbered page: a light band of the footer's color (gray without one), a stronger rule on top of it. */
export const drawBannerFooterBand = (pdf: PdfWriter, letter: LetterDto) => {
    const color = letter.company.colors.footer ?? DARK;
    const width = pdf.pageWidth();
    pdf.drawRect(0, 0, width, 58, tint(color, 0.1));
    pdf.drawRect(0, 57, width, 1.5, color);
};

// The payment conditions on the left of the totals box (modern-letter.ts's
// BesideTotals) - room a quote or an invoice otherwise leaves empty, and
// what keeps them on page 1 rather than alone on the QR-bill's page. As far
// as the box's left edge, less a gap.
const BESIDE_RIGHT = 312;
const SCALE_ROW = 14;
const SCALE_TINT = 0.18;
const SCALE_GRAY: PdfColor = { r: 0.92, g: 0.92, b: 0.92 };

// Beyond this, the conditions go under the totals instead, where they can
// run onto the next page (drawn beside, they're one block on one page).
const BESIDE_MAX_HEIGHT = 220;

/** "Conditions de paiement :", its lines and an invoice's payment scale, drawn beside the totals - null when there's nothing to say, or too much for beside them (the caller prints them under, see drawConditionsBlock). */
export const conditionsBesideTotals = (
    pdf: PdfWriter,
    heading: string,
    lines: string[],
    colors: PrintColors,
    scale: PaymentScaleRow[] = [],
): BesideTotals | null => {
    if (lines.length === 0 && scale.length === 0) {
        return null;
    }
    const left = pdf.marginValue();
    const width = BESIDE_RIGHT - left;
    const headingOptions: PdfTextOptions = { size: 10, bold: true, ...(colors.conditionsHeading ? { color: colors.conditionsHeading } : {}) };
    const textOptions: PdfTextOptions = { size: 9.5 };
    const wrapped = lines.flatMap(line => pdf.wrapLines(line, width, textOptions));
    const height = 16 + wrapped.length * 12 + (scale.length > 0 ? 6 + scale.length * SCALE_ROW : 0);
    if (height > BESIDE_MAX_HEIGHT) {
        return null;
    }
    return {
        height,
        draw: (top: number) => {
            let y = top - 12;
            pdf.drawTextAt(`${heading} :`, left, y, headingOptions);
            y -= 16;
            for (const line of wrapped) {
                pdf.drawTextAt(line, left, y, textOptions);
                y -= 12;
            }
            if (scale.length > 0) {
                y -= 6;
                const bands = {
                    early: colors.scaleEarly ? tint(colors.scaleEarly, SCALE_TINT) : SCALE_GRAY,
                    net: colors.scaleNet ? tint(colors.scaleNet, SCALE_TINT) : SCALE_GRAY,
                };
                for (const row of scale) {
                    if (row.highlight) {
                        pdf.drawRect(left - 4, y - 4, width + 8, SCALE_ROW, bands[row.highlight]);
                    }
                    pdf.drawTextAt(row.label, left, y, textOptions);
                    if (row.value) {
                        pdf.drawTextRightAt(row.value, BESIDE_RIGHT, y, textOptions);
                    }
                    y -= SCALE_ROW;
                }
            }
        },
    };
};
