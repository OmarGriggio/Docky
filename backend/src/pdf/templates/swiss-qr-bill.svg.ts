import QRCode from "qrcode";
import { SwissQrBillDto } from "../swiss-qr-bill/swiss-qr-bill.types";
import { buildSwissQrBillPayload } from "../swiss-qr-bill/swiss-qr-bill.payload";
import { PdfLabels } from "./pdf-labels";

// The Swiss QR-bill payment slip on its own, as an SVG at its official size
// (210 × 105 mm, one user unit = 1 mm) - for the standalone slip page, which
// turns it into an image to paste into Word/Excel. Same layout as
// swiss-qr-bill.template.ts (the PDF one, drawn from the bottom with
// pdf-lib), only measured from the top here, with the font sizes the Swiss
// Implementation Guidelines give (title 11pt; receipt headings 6pt and
// values 8pt; payment part headings 8pt and values 10pt).

const pt = (value: number) => value * 25.4 / 72;

const FONT = {
    title: pt(11),
    receiptHeading: pt(6),
    receiptValue: pt(8),
    paymentHeading: pt(8),
    paymentValue: pt(10),
};

const QR = { x: 67, y: 17, size: 46 };
const CROSS_SIZE = 7;
const LINE_WIDTH = 0.2;
const SCISSORS = "✂";
const SCISSORS_SIZE = 4;

const escapeXml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const text = (value: string, x: number, y: number, size: number, options: { bold?: boolean; anchor?: "start" | "end" } = {}) =>
    `<text x="${x}" y="${y.toFixed(2)}" font-size="${size.toFixed(3)}"${options.bold ? ` font-weight="bold"` : ""}${options.anchor === "end" ? ` text-anchor="end"` : ""}>${escapeXml(value)}</text>`;

const line = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="${LINE_WIDTH}"/>`;

// An "L" at each corner of a box - an empty field to fill in by hand.
const cornerMarks = (x1: number, y1: number, x2: number, y2: number, length = 3) =>
    [
        line(x1, y1, x1 + length, y1), line(x1, y1, x1, y1 + length),
        line(x2, y1, x2 - length, y1), line(x2, y1, x2, y1 + length),
        line(x1, y2, x1 + length, y2), line(x1, y2, x1, y2 - length),
        line(x2, y2, x2 - length, y2), line(x2, y2, x2, y2 - length),
    ].join("");

// Printed with a space every three digits ("1 234.50"), as the guidelines
// ask - the QR payload itself keeps the plain "1234.50".
const formatAmount = (amount: number) => {
    const [whole, cents] = amount.toFixed(2).split(".");
    return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}.${cents}`;
};

const formatIban = (iban: string) => iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

// The QR code as its own nested <svg>, sized to exactly 46 × 46 mm (no quiet
// zone of its own - the slip around it is already blank there), with the
// Swiss cross (7 × 7 mm) on top of its center.
const qrCode = async (payload: string): Promise<string> => {
    const qrSvg = await QRCode.toString(payload, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
    const nested = qrSvg
        .replace(/<\?xml[^>]*>/, "")
        .replace(/<svg\b([^>]*)>/, (_match, attributes: string) =>
            `<svg${attributes.replace(/\s(width|height)="[^"]*"/g, "")} x="${QR.x}" y="${QR.y}" width="${QR.size}" height="${QR.size}">`);

    const cx = QR.x + QR.size / 2;
    const cy = QR.y + QR.size / 2;
    const black = CROSS_SIZE - 1;
    const arm = black * 0.6;
    const thickness = black * 0.2;
    const cross = [
        `<rect x="${cx - CROSS_SIZE / 2}" y="${cy - CROSS_SIZE / 2}" width="${CROSS_SIZE}" height="${CROSS_SIZE}" fill="#fff"/>`,
        `<rect x="${cx - black / 2}" y="${cy - black / 2}" width="${black}" height="${black}" fill="#000"/>`,
        `<rect x="${cx - arm / 2}" y="${cy - thickness / 2}" width="${arm}" height="${thickness}" fill="#fff"/>`,
        `<rect x="${cx - thickness / 2}" y="${cy - arm / 2}" width="${thickness}" height="${arm}" fill="#fff"/>`,
    ].join("");

    return nested + cross;
};

// `debtorLines` are the lines printed under "Payable by" - by default the
// debtor's own name and two address lines, but the standalone slip prints an
// extra address complement on a line of its own (it's folded into address
// line 1 in the QR payload itself, see qr-bill-slip.ts).
export const renderSwissQrBillSvg = async (
    dto: SwissQrBillDto,
    labels: PdfLabels,
    debtorLines: string[] | null = dto.debtor ? [dto.debtor.name, dto.debtor.addressLine1, dto.debtor.addressLine2] : null
): Promise<string> => {
    const { creditor, payment } = dto;
    const creditorLines = [formatIban(creditor.iban), creditor.name, creditor.addressLine1, creditor.addressLine2].filter(Boolean);
    const printedDebtor = debtorLines?.filter(Boolean) ?? [];
    const amount = payment.amount != null ? formatAmount(payment.amount) : null;
    const parts: string[] = [];

    parts.push(`<rect width="210" height="105" fill="#fff"/>`);
    parts.push(line(0, 0.1, 210, 0.1), line(62, 0, 62, 105));
    // Pasted into a document and printed on plain (not perforated) paper,
    // the guidelines want a pair of scissors on the cutting lines. Drawn as
    // the Unicode glyph - the browser rendering this SVG falls back to a
    // system font that has it (Segoe UI Symbol on Windows). The vertical
    // one sits over its line, on a white background that breaks it.
    parts.push(`<text x="5" y="${(SCISSORS_SIZE * 0.85).toFixed(2)}" font-size="${SCISSORS_SIZE}" font-family="Segoe UI Symbol, Apple Symbols, DejaVu Sans, sans-serif">${SCISSORS}</text>`);
    parts.push(`<g transform="translate(62 8) rotate(90)"><rect x="${-SCISSORS_SIZE / 2}" y="${-SCISSORS_SIZE / 2}" width="${SCISSORS_SIZE}" height="${SCISSORS_SIZE}" fill="#fff"/><text x="0" y="${(SCISSORS_SIZE * 0.35).toFixed(2)}" font-size="${SCISSORS_SIZE}" text-anchor="middle" font-family="Segoe UI Symbol, Apple Symbols, DejaVu Sans, sans-serif">${SCISSORS}</text></g>`);

    // Receipt (left, 62 mm wide)
    let y = 11;
    parts.push(text(labels.qrReceipt, 5, y, FONT.title, { bold: true }));
    parts.push(text(labels.qrAccount, 5, y += 7, FONT.receiptHeading, { bold: true }));
    for (const value of creditorLines) {
        parts.push(text(value, 5, y += 4, FONT.receiptValue));
    }
    if (printedDebtor.length > 0) {
        parts.push(text(labels.qrPayableBy, 5, y += 7, FONT.receiptHeading, { bold: true }));
        for (const value of printedDebtor) {
            parts.push(text(value, 5, y += 4, FONT.receiptValue));
        }
    } else {
        parts.push(text(labels.qrPayableByBlank, 5, y += 7, FONT.receiptHeading, { bold: true }));
        parts.push(cornerMarks(5, y + 2, 57, y + 22));
    }
    parts.push(text(labels.qrCurrency, 5, 72, FONT.receiptHeading, { bold: true }));
    parts.push(text(payment.currency, 5, 78, FONT.receiptValue));
    if (amount) {
        parts.push(text(labels.qrAmount, 25, 72, FONT.receiptHeading, { bold: true }));
        parts.push(text(amount, 25, 78, FONT.receiptValue));
    } else {
        // The guidelines' blank fields: 30 × 10 mm here, 40 × 15 mm in the
        // payment part, 65 × 25 mm for the payer there.
        parts.push(text(labels.qrAmount, 27, 72, FONT.receiptHeading, { bold: true }));
        parts.push(cornerMarks(27, 74, 57, 84));
    }
    parts.push(text(labels.qrAcceptancePoint, 57, 91, FONT.receiptHeading, { bold: true, anchor: "end" }));

    // Payment part (right, 148 mm wide)
    parts.push(text(labels.qrPaymentPart, 67, 11, FONT.title, { bold: true }));
    parts.push(await qrCode(buildSwissQrBillPayload(dto)));
    parts.push(text(labels.qrCurrency, 67, 72, FONT.paymentHeading, { bold: true }));
    parts.push(text(payment.currency, 67, 78, FONT.paymentValue));
    if (amount) {
        parts.push(text(labels.qrAmount, 87, 72, FONT.paymentHeading, { bold: true }));
        parts.push(text(amount, 87, 78, FONT.paymentValue));
    } else {
        parts.push(text(labels.qrAmount, 82, 72, FONT.paymentHeading, { bold: true }));
        parts.push(cornerMarks(82, 74, 122, 89));
    }

    y = 11;
    parts.push(text(labels.qrAccount, 118, y, FONT.paymentHeading, { bold: true }));
    for (const value of creditorLines) {
        parts.push(text(value, 118, y += 5, FONT.paymentValue));
    }
    if (payment.additionalInfo) {
        parts.push(text(labels.qrAdditionalInfo, 118, y += 9, FONT.paymentHeading, { bold: true }));
        parts.push(text(payment.additionalInfo, 118, y += 5, FONT.paymentValue));
    }
    if (printedDebtor.length > 0) {
        parts.push(text(labels.qrPayableBy, 118, y += 9, FONT.paymentHeading, { bold: true }));
        for (const value of printedDebtor) {
            parts.push(text(value, 118, y += 5, FONT.paymentValue));
        }
    } else {
        parts.push(text(labels.qrPayableByBlank, 118, y += 9, FONT.paymentHeading, { bold: true }));
        parts.push(cornerMarks(118, y + 2, 183, y + 27));
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="105mm" viewBox="0 0 210 105" font-family="Helvetica, Arial, sans-serif">${parts.join("")}</svg>`;
};
