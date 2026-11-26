import { PdfWriter } from "../core/pdf-writer";
import { QuoteDto } from "./quote.types";
import { formatLongDate, PDF_LABELS } from "./pdf-labels";
import { formatShortDate } from "./format";
import { drawConditionsBlock, drawConclusion, drawLetterDetails, drawLetterHead, drawPositions, drawTotalsTable } from "./business-letter";
import { drawModernHead, drawModernItems, drawModernTotals } from "./modern-letter";
import { conditionsBesideTotals, drawBannerHead, drawBannerItems } from "./banner-letter";

// The shared invoice/quote layout (business-letter.ts), titled "OFFRE" -
// what's a quote's own: no early payment discount (nothing to pay yet), the
// client's "Bon pour accord" date and signature lines after the conclusion,
// and its validity plus the company's payment terms after those.
// No Swiss QR-bill page either.
export class QuoteTemplate {

    static async renderRecap(pdf: PdfWriter, quote: QuoteDto, logoBytes: Buffer | null, hasHeaderImage: boolean) {
        const labels = PDF_LABELS[quote.language];

        const title = `${labels.quote.toUpperCase()} N° ${quote.number}`;
        const conditions: string[] = [];
        if (quote.validUntil) {
            conditions.push(labels.validUntil(formatLongDate(quote.validUntil, quote.language)));
        }
        if (quote.paymentTerms) {
            conditions.push(quote.paymentTerms);
        }

        if (quote.company.layout === "BANNER") {
            // Every line here, a table per section (banner-letter.ts) - no
            // details page - and the conditions beside the totals.
            const details = quote.validUntil ? [{ label: labels.validUntilShort, value: formatShortDate(quote.validUntil) }] : [];
            await drawBannerHead(pdf, quote, { title, logoBytes, hasHeaderImage, details });
            drawBannerItems(pdf, quote);
            // Its validity is in the grid already.
            const terms = quote.paymentTerms ? [quote.paymentTerms] : [];
            drawModernTotals(pdf, quote, null, conditionsBesideTotals(pdf, labels.paymentConditions, terms, quote.company.colors));
            drawConclusion(pdf, quote);
            this.drawApproval(pdf, quote);
            return;
        } else if (quote.company.layout === "MODERN") {
            // Every line right here (modern-letter.ts) - no details page.
            await drawModernHead(pdf, quote, { title, logoBytes, hasHeaderImage });
            drawModernItems(pdf, quote);
            drawModernTotals(pdf, quote);
        } else {
            await drawLetterHead(pdf, quote, { title, logoBytes, hasHeaderImage });
            drawPositions(pdf, quote);
            drawTotalsTable(pdf, quote);
        }
        drawConclusion(pdf, quote);
        this.drawApproval(pdf, quote);
        drawConditionsBlock(pdf, labels.paymentConditions, conditions, quote.company.colors);
    }

    // The client's own acceptance, distinct from the company's signature in
    // the conclusion - blank date/signature lines to fill in by hand once
    // printed (no real e-signature yet), side by side on one row, both
    // labels at the exact same Y (drawTextAt, not the flowing cursor).
    // Tighter in the banner layout, whose page 1 holds every line already.
    private static drawApproval(pdf: PdfWriter, quote: QuoteDto) {
        const labels = PDF_LABELS[quote.language];
        const compact = quote.company.layout === "BANNER";
        const [marginTop, marginBottom] = compact ? [0, 12] : [10, 22];
        // What it takes: the heading after its gap, the room under it, the row of lines.
        pdf.reserve(marginTop + marginBottom + 30);
        const secondary = quote.company.colors.approval;
        pdf.text(labels.approval, { bold: true, size: 10, marginTop, marginBottom, ...(secondary ? { color: secondary } : {}) });

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
