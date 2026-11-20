import { PdfWriter } from "../core/pdf-writer";
import { InvoiceDto } from "./invoice.types";
import { formatLongDate, PDF_LABELS } from "./pdf-labels";
import { drawConditionsBlock, drawConclusion, drawLetterDetails, drawLetterHead, drawPositions, drawTotalsTable } from "./business-letter";
import { drawModernHead, drawModernItems, drawModernTotals } from "./modern-letter";
import { formatShortDate } from "./format";

// The shared invoice/quote layout (business-letter.ts), with what's an
// invoice's own: its Lieu/Bâtiment under the reference, the early payment
// discount under the total, and the payment conditions after the
// conclusion. See invoice-pdf-generator.ts for how the pages are stitched
// together (and where the Swiss QR-bill lands).
export class InvoiceTemplate {

    static async renderRecap(pdf: PdfWriter, invoice: InvoiceDto, logoBytes: Buffer | null, hasHeaderImage: boolean) {
        const labels = PDF_LABELS[invoice.language];

        const title = `${(invoice.invoiceKind === "DEPOSIT" ? labels.depositInvoice : invoice.deductions?.length ? labels.finalInvoice : labels.invoice).toUpperCase()} N° ${invoice.number}`;
        if (invoice.company.layout === "MODERN") {
            // Every line right here (modern-letter.ts) - no details page.
            await drawModernHead(pdf, invoice, {
                title,
                logoBytes,
                hasHeaderImage,
                info: [
                    ...(invoice.dueDate ? [{ label: labels.dueDate, value: formatShortDate(invoice.dueDate) }] : []),
                    ...(invoice.location ? [{ label: labels.location, value: invoice.location }] : []),
                ],
            });
            drawModernItems(pdf, invoice);
            drawModernTotals(pdf, invoice, invoice.earlyPayment);
        } else {
            await drawLetterHead(pdf, invoice, {
                title,
                logoBytes,
                hasHeaderImage,
                extraReferenceLines: invoice.location ? [`${labels.location} : ${invoice.location}`] : [],
            });
            drawPositions(pdf, invoice);
            drawTotalsTable(pdf, invoice, invoice.earlyPayment);
        }
        drawConclusion(pdf, invoice);

        const conditions: string[] = [];
        if (invoice.dueDate) {
            conditions.push(`${labels.dueDate} : ${formatLongDate(invoice.dueDate, invoice.language)}`);
        }
        if (invoice.paymentTerms) {
            conditions.push(invoice.paymentTerms);
        }
        drawConditionsBlock(pdf, labels.paymentConditions, conditions, invoice.company.colors, invoice.paymentScale);
    }

    static renderDetails(pdf: PdfWriter, invoice: InvoiceDto) {
        const labels = PDF_LABELS[invoice.language];
        drawLetterDetails(pdf, invoice, `${labels.invoice} ${invoice.number} — ${invoice.client.name}`);
    }

}
