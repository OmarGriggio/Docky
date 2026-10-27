import { PdfWriter } from "../core/pdf-writer";
import { InvoiceDto } from "./invoice.types";
import { formatLongDate, PDF_LABELS } from "./pdf-labels";
import { drawBottomBlock, drawConclusion, drawLetterDetails, drawLetterHead, drawPositions, drawTotalsTable } from "./business-letter";

// The shared invoice/quote layout (business-letter.ts), with what's an
// invoice's own: its Lieu/Bâtiment under the reference, the early payment
// discount under the total, and the payment conditions at the bottom of
// page 1. See invoice-pdf-generator.ts for how the pages are stitched
// together (and where the Swiss QR-bill lands).
export class InvoiceTemplate {

    static async renderRecap(pdf: PdfWriter, invoice: InvoiceDto, logoBytes: Buffer | null, hasHeaderImage: boolean) {
        const labels = PDF_LABELS[invoice.language];

        await drawLetterHead(pdf, invoice, {
            title: `${labels.invoice.toUpperCase()} N° ${invoice.number}`,
            logoBytes,
            hasHeaderImage,
            extraReferenceLines: invoice.location ? [`${labels.location} : ${invoice.location}`] : [],
        });
        drawPositions(pdf, invoice);
        drawTotalsTable(pdf, invoice, invoice.earlyPayment);
        drawConclusion(pdf, invoice);

        const conditions: string[] = [];
        if (invoice.dueDate) {
            conditions.push(`${labels.dueDate} : ${formatLongDate(invoice.dueDate, invoice.language)}`);
        }
        if (invoice.paymentTerms) {
            conditions.push(invoice.paymentTerms);
        }
        drawBottomBlock(pdf, labels.paymentConditions, conditions);
    }

    static renderDetails(pdf: PdfWriter, invoice: InvoiceDto) {
        const labels = PDF_LABELS[invoice.language];
        drawLetterDetails(pdf, invoice, `${labels.invoice} ${invoice.number} — ${invoice.client.name}`);
    }

}
