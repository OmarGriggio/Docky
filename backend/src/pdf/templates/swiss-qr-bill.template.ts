import { PdfWriter } from "../core/pdf-writer";
import { SwissQrBillDto } from "../swiss-qr-bill/swiss-qr-bill.types";

const mm = (value: number) => value * 2.83465;

const SIZE = {
    text: mm(2.5),
    title1: mm(3.5),
    title2: mm(2.5),
};

const QR_SIZE = mm(46);
const QR_X = mm(67);
const QR_Y = mm(42);

/**
 * Draws the Swiss QR-bill receipt + payment part in the bottom 105mm of the
 * writer's current page, rendered as the second page of the invoice.
 */
export class SwissQrBillTemplate {

    static async render(pdf: PdfWriter, dto: SwissQrBillDto, qrImageBytes: Buffer) {
        this.drawSeparators(pdf);
        await this.drawQrCode(pdf, qrImageBytes);
        this.drawReceiptSection(pdf, dto);
        this.drawPaymentSection(pdf, dto);
    }

    private static drawSeparators(pdf: PdfWriter) {
        pdf.drawLineAt({ x: mm(62), y: mm(105) }, { x: mm(62), y: mm(0) });
        pdf.drawLineAt({ x: mm(0), y: mm(104.92) }, { x: mm(210), y: mm(104.92) });
    }

    private static drawReceiptSection(pdf: PdfWriter, dto: SwissQrBillDto) {
        const { creditor, debtor, payment } = dto;
        let y = 94;

        pdf.drawTextAt("Récépissé", mm(5), mm(y), { size: SIZE.title1, bold: true });

        pdf.drawTextAt("Compte / Payable à", mm(5), mm(y -= 7), { size: SIZE.title2 - 1, bold: true });
        pdf.drawTextAt(formatIban(creditor.iban), mm(5), mm(y -= 4), { size: SIZE.text });
        pdf.drawTextAt(creditor.name, mm(5), mm(y -= 4), { size: SIZE.text });
        pdf.drawTextAt(creditor.addressLine1, mm(5), mm(y -= 4), { size: SIZE.text });
        pdf.drawTextAt(creditor.addressLine2, mm(5), mm(y -= 4), { size: SIZE.text });

        if (debtor) {
            pdf.drawTextAt("Payable par", mm(5), mm(y -= 7), { size: SIZE.title2, bold: true });
            pdf.drawTextAt(debtor.name, mm(5), mm(y -= 4), { size: SIZE.text });
            pdf.drawTextAt(debtor.addressLine1, mm(5), mm(y -= 4), { size: SIZE.text });
            pdf.drawTextAt(debtor.addressLine2, mm(5), mm(y -= 4), { size: SIZE.text });
        } else {
            pdf.drawTextAt("Payable par (nom/adresse)", mm(5), mm(y -= 5), { size: SIZE.title2 - 1, bold: true });
            drawCornerMarks(pdf, mm(5), mm(y - 20), mm(57), mm(y - 2));
        }

        this.drawAmountBlock(pdf, payment, {
            x: 5, currencyY: 33, amountX: 25, emptyAmountX: 18,
            emptyBox: { x1: 30, y1: 24, x2: 57, y2: 35 },
        });

        pdf.drawTextAt("Point de dépôt", mm(39), mm(20), { size: SIZE.text - 1 });
    }

    private static drawPaymentSection(pdf: PdfWriter, dto: SwissQrBillDto) {
        const { creditor, debtor, payment } = dto;

        pdf.drawTextAt("Section paiement", mm(67), mm(94), { size: SIZE.title1, bold: true });

        this.drawAmountBlock(pdf, payment, {
            x: 67, currencyY: 33, amountX: 87, emptyAmountX: 83, sizeBoost: 2,
            emptyBox: { x1: 83, y1: 18, x2: 114, y2: 30 },
        });

        let y = 94;
        pdf.drawTextAt("Compte / Payable à", mm(118), mm(y), { size: SIZE.title2 + 2, bold: true });
        pdf.drawTextAt(formatIban(creditor.iban), mm(118), mm(y -= 5), { size: SIZE.text + 2 });
        pdf.drawTextAt(creditor.name, mm(118), mm(y -= 5), { size: SIZE.text + 2 });
        pdf.drawTextAt(creditor.addressLine1, mm(118), mm(y -= 5), { size: SIZE.text + 2 });
        pdf.drawTextAt(creditor.addressLine2, mm(118), mm(y -= 5), { size: SIZE.text + 2 });

        if (debtor) {
            pdf.drawTextAt("Payable par", mm(118), mm(y -= 9), { size: SIZE.title2 + 2, bold: true });
            pdf.drawTextAt(debtor.name, mm(118), mm(y -= 5), { size: SIZE.text + 2 });
            pdf.drawTextAt(debtor.addressLine1, mm(118), mm(y -= 5), { size: SIZE.text + 2 });
            pdf.drawTextAt(debtor.addressLine2, mm(118), mm(y -= 5), { size: SIZE.text + 2 });
        } else {
            pdf.drawTextAt("Payable par (nom/adresse)", mm(118), mm(y -= 5), { size: SIZE.title2 + 2, bold: true });
            drawCornerMarks(pdf, mm(118), mm(y - 28), mm(205), mm(y - 2));
        }
    }

    /** Currency + amount, or an empty placeholder box when the amount is unknown. */
    private static drawAmountBlock(
        pdf: PdfWriter,
        payment: SwissQrBillDto["payment"],
        layout: {
            x: number; currencyY: number; amountX: number; emptyAmountX: number; sizeBoost?: number;
            emptyBox: { x1: number; y1: number; x2: number; y2: number };
        },
    ) {
        const boost = layout.sizeBoost ?? 0;

        pdf.drawTextAt("Monnaie", mm(layout.x), mm(layout.currencyY), { size: SIZE.title2 + boost, bold: true });
        pdf.drawTextAt(payment.currency, mm(layout.x), mm(layout.currencyY - 6), { size: SIZE.text + boost });

        if (payment.amount != null) {
            pdf.drawTextAt("Montant", mm(layout.amountX), mm(layout.currencyY), { size: SIZE.title2 + boost, bold: true });
            pdf.drawTextAt(payment.amount.toFixed(2), mm(layout.amountX), mm(layout.currencyY - 6), { size: SIZE.text + boost });
        } else {
            pdf.drawTextAt("Montant", mm(layout.emptyAmountX), mm(layout.currencyY), { size: SIZE.title2 + boost, bold: true });
            const box = layout.emptyBox;
            drawCornerMarks(pdf, mm(box.x1), mm(box.y1), mm(box.x2), mm(box.y2));
        }
    }

    private static async drawQrCode(pdf: PdfWriter, qrImageBytes: Buffer) {
        const qrImage = await pdf.embedPng(qrImageBytes);
        pdf.drawImage(qrImage, QR_X, QR_Y, QR_SIZE, QR_SIZE);

        // Swiss cross overlay, centered on the QR code.
        const bgSize = mm(6);
        const bgX = QR_X + QR_SIZE / 2 - bgSize / 2;
        const bgY = QR_Y + QR_SIZE / 2 - bgSize / 2;
        pdf.drawRect(bgX, bgY, bgSize, bgSize, { r: 1, g: 1, b: 1 });

        const crossSize = mm(5);
        const crossX = QR_X + QR_SIZE / 2 - crossSize / 2;
        const crossY = QR_Y + QR_SIZE / 2 - crossSize / 2;
        pdf.drawRect(crossX, crossY, crossSize, crossSize, { r: 0, g: 0, b: 0 });

        pdf.drawRect(crossX + crossSize * 0.2, crossY + crossSize * 0.4, crossSize * 0.6, crossSize * 0.2, { r: 1, g: 1, b: 1 });
        pdf.drawRect(crossX + crossSize * 0.4, crossY + crossSize * 0.2, crossSize * 0.2, crossSize * 0.6, { r: 1, g: 1, b: 1 });
    }
}

/** Draws an "L" tick at each corner of a rectangle, marking an empty field to fill in by hand. */
function drawCornerMarks(pdf: PdfWriter, x1: number, y1: number, x2: number, y2: number, markLength = mm(3)) {
    const corners = [
        { x: x1, y: y1, dx: 1, dy: 1 },
        { x: x2, y: y1, dx: -1, dy: 1 },
        { x: x1, y: y2, dx: 1, dy: -1 },
        { x: x2, y: y2, dx: -1, dy: -1 },
    ];

    for (const corner of corners) {
        pdf.drawLineAt({ x: corner.x, y: corner.y }, { x: corner.x + corner.dx * markLength, y: corner.y });
        pdf.drawLineAt({ x: corner.x, y: corner.y }, { x: corner.x, y: corner.y + corner.dy * markLength });
    }
}

function formatIban(iban: string): string {
    return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}
