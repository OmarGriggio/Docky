import { PdfWriter } from "../core/pdf-writer";
import { QuoteDto } from "./quote.types";
import { formatLongDate, PDF_LABELS } from "./pdf-labels";
import { drawBottomBlock, drawConclusion, drawLetterDetails, drawLetterHead, drawPositions, drawTotalsTable } from "./business-letter";

// The shared invoice/quote layout (business-letter.ts), titled "OFFRE" -
// what's a quote's own: no early payment discount (nothing to pay yet), the
// client's "Bon pour accord" date and signature lines after the conclusion,
// and its validity plus the company's payment terms at the bottom of page 1.
// No Swiss QR-bill page either.
export class QuoteTemplate {

    static async renderRecap(pdf: PdfWriter, quote: QuoteDto, logoBytes: Buffer | null, hasHeaderImage: boolean) {
        const labels = PDF_LABELS[quote.language];

        await drawLetterHead(pdf, quote, {
            title: `${labels.quote.toUpperCase()} N° ${quote.number}`,
            logoBytes,
            hasHeaderImage,
        });
        drawPositions(pdf, quote);
        drawTotalsTable(pdf, quote);
        drawConclusion(pdf, quote);
        this.drawApproval(pdf, quote);

        const conditions: string[] = [];
        if (quote.validUntil) {
            conditions.push(labels.validUntil(formatLongDate(quote.validUntil, quote.language)));
        }
        if (quote.paymentTerms) {
            conditions.push(quote.paymentTerms);
        }
        drawBottomBlock(pdf, labels.paymentConditions, conditions);
    }

    // The client's own acceptance, distinct from the company's signature in
    // the conclusion - blank date/signature lines to fill in by hand once
    // printed (no real e-signature yet), side by side on one row, both
    // labels at the exact same Y (drawTextAt, not the flowing cursor).
    private static drawApproval(pdf: PdfWriter, quote: QuoteDto) {
        const labels = PDF_LABELS[quote.language];
        pdf.reserve(70);
        pdf.text(labels.approval, { bold: true, size: 10, marginTop: 10, marginBottom: 22 });

        const rowY = pdf.remainingHeight();
        const margin = pdf.marginValue();
        pdf.drawTextAt(labels.date, margin, rowY, { size: 10 });
        this.drawSignatureLine(pdf, margin + 35, rowY - 3, 140);

        pdf.drawTextAt(labels.signature, margin + 250, rowY, { size: 10 });
        this.drawSignatureLine(pdf, margin + 250 + 62, rowY - 3, 160);

        pdf.lowerCursorTo(rowY - 15);
    }

    /** A short blank line to sign/date on, drawn by absolute position - independent of the flowing cursor, which the caller is responsible for advancing past afterwards. */
    private static drawSignatureLine(pdf: PdfWriter, x: number, y: number, width: number) {
        pdf.drawLineAt({ x, y }, { x: x + width, y }, 0.5);
    }

    static renderDetails(pdf: PdfWriter, quote: QuoteDto) {
        const labels = PDF_LABELS[quote.language];
        drawLetterDetails(pdf, quote, `${labels.quote} ${quote.number} — ${quote.client.name}`);
    }

}
