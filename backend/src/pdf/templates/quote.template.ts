import { PdfWriter } from "../core/pdf-writer";
import { QuoteDto } from "./quote.types";
import { formatLongDate, PDF_LABELS } from "./pdf-labels";
import { drawLetterHead, drawSectionDetails, drawTotals } from "./letter";

// Mirrors InvoiceTemplate (invoice.template.ts) - same page 1 recap/page 2
// detail split and the same totals block (a quote's discount/VAT are
// carried over from the document as stored, so the client signs the exact
// amount that later gets invoiced), titled "Offre" with an optional validity
// date instead of payment terms. Deliberately without: a Lieu/Bâtiment
// (always the client's plain billing address), the company's own VAT number
// (not a legal requirement before this becomes a real invoice), and the
// Swiss QR-bill page (nothing to pay yet on a quote).
export class QuoteTemplate {

    static async renderRecap(pdf: PdfWriter, quote: QuoteDto, logoBytes: Buffer | null) {
        const labels = PDF_LABELS[quote.language];

        await drawLetterHead(pdf, {
            company: quote.company,
            client: quote.client,
            date: quote.date,
            language: quote.language,
            logoBytes,
        });

        pdf.text(`${labels.quoteNumber} ${quote.number}`, { bold: true, marginBottom: 10 });

        pdf.text(quote.introduction, { marginBottom: 15 });

        drawTotals(pdf, quote);

        if (quote.validUntil) {
            pdf.text(labels.validUntil(formatLongDate(quote.validUntil, quote.language)), { marginBottom: 15 });
        }

        // The company's own signature (for now just its name) is part of
        // the conclusion text itself - {{signature_entreprise}}, see
        // quote.dto.ts.
        pdf.text(quote.conclusion);

        // The client's own acceptance, distinct from the company's own
        // signature above - blank date/signature lines for them to fill in
        // by hand once printed (no real e-signature yet), side by side on
        // one row. Both labels use drawTextAt (an absolute position, not
        // the flowing cursor) so they land on the exact same Y - the
        // flowing pdf.text() can't do that for a second, indented label:
        // it always advances the cursor down after drawing, and
        // lowerCursorTo only ever moves it further down, never back up to
        // realign a second label with the first.
        pdf.text(labels.approval, { bold: true, marginTop: 30, marginBottom: 25 });

        const rowY = pdf.remainingHeight();
        const margin = pdf.marginValue();
        pdf.drawTextAt(labels.date, margin, rowY);
        this.drawSignatureLine(pdf, margin + 35, rowY - 3, 140);

        pdf.drawTextAt(labels.signature, margin + 250, rowY);
        this.drawSignatureLine(pdf, margin + 250 + 62, rowY - 3, 160);

        pdf.lowerCursorTo(rowY - 15);
    }

    /** A short blank line to sign/date on, drawn by absolute position - independent of the flowing cursor, which the caller is responsible for advancing past afterwards. */
    private static drawSignatureLine(pdf: PdfWriter, x: number, y: number, width: number) {
        pdf.drawLineAt({ x, y }, { x: x + width, y }, 0.5);
    }

    static renderDetails(pdf: PdfWriter, quote: QuoteDto) {
        const labels = PDF_LABELS[quote.language];
        drawSectionDetails(pdf, `${labels.quote} ${quote.number} — ${quote.client.name}`, quote.sections, quote.language);

        // The company's own default payment terms (see quote.dto.ts) -
        // informational only, a quote has no payment obligation of its own
        // yet, but the client should still know them upfront.
        if (quote.paymentTerms) {
            pdf.text(quote.paymentTerms, { marginTop: 20 });
        }
    }

}
