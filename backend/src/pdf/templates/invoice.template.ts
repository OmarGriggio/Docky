import { PdfWriter } from "../core/pdf-writer";
import { InvoiceDto } from "./invoice.types";
import { formatLongDate, PDF_LABELS } from "./pdf-labels";
import { CLASSIC_CONDITIONS_GAP, drawConditionsBlock, drawConclusion, drawLetterDetails, drawLetterHead, drawPositions, drawTotalsTable } from "./business-letter";
import { drawModernHead, drawModernItems, drawModernTotals } from "./modern-letter";
import { conditionsBesideTotals, drawBannerHead, drawBannerItems } from "./banner-letter";
import { formatShortDate } from "./format";

// The shared invoice/quote layout (business-letter.ts), with what's an
// invoice's own: its service date or period and its Lieu/Bâtiment under
// the reference, the early payment discount under the total, and the
// payment conditions after the conclusion. See invoice-pdf-generator.ts for how the pages are stitched
// together (and where the Swiss QR-bill lands).
export class InvoiceTemplate {

    static async renderRecap(pdf: PdfWriter, invoice: InvoiceDto, logoBytes: Buffer | null, hasHeaderImage: boolean) {
        const labels = PDF_LABELS[invoice.language];

        const kind = (invoice.invoiceKind === "DEPOSIT" ? labels.depositInvoice : invoice.deductions?.length ? labels.finalInvoice : labels.invoice).toUpperCase();
        const title = `${kind} N° ${invoice.number}`;
        // Its own details, in the modern and banner layouts' right-hand column or grid.
        const details = [
            ...(invoice.dueDate ? [{ label: labels.dueDate, value: formatShortDate(invoice.dueDate) }] : []),
            ...(invoice.servicePeriod ? [{ label: labels.serviceShort, value: invoice.servicePeriod.value }] : []),
            ...(invoice.location ? [{ label: labels.location, value: invoice.location }] : []),
        ];
        const conditions: string[] = [];
        if (invoice.dueDate) {
            conditions.push(`${labels.dueDate} : ${formatLongDate(invoice.dueDate, invoice.language)}`);
        }
        if (invoice.paymentTerms) {
            conditions.push(invoice.paymentTerms);
        }

        if (invoice.company.layout === "BANNER") {
            // Every line here too (banner-letter.ts), a table per section - no
            // details page - and the payment conditions beside the totals.
            await drawBannerHead(pdf, invoice, { kind, number: `N° ${invoice.number}`, logoBytes, hasHeaderImage, details });
            drawBannerItems(pdf, invoice);
            // The due date is in the grid already.
            const terms = invoice.paymentTerms ? [invoice.paymentTerms] : [];
            const beside = conditionsBesideTotals(pdf, labels.paymentConditions, terms, invoice.company.colors, invoice.paymentScale);
            drawModernTotals(pdf, invoice, invoice.earlyPayment, beside);
            drawConclusion(pdf, invoice);
            if (!beside) {
                // Too long to sit beside the totals (or nothing to say).
                drawConditionsBlock(pdf, labels.paymentConditions, terms, invoice.company.colors, invoice.paymentScale);
            }
            return;
        } else if (invoice.company.layout === "MODERN") {
            // Every line right here (modern-letter.ts) - no details page.
            await drawModernHead(pdf, invoice, {
                title,
                logoBytes,
                hasHeaderImage,
                info: details,
            });
            drawModernItems(pdf, invoice);
            drawModernTotals(pdf, invoice, invoice.earlyPayment);
        } else {
            await drawLetterHead(pdf, invoice, {
                title,
                logoBytes,
                hasHeaderImage,
                extraReferenceLines: [
                    ...(invoice.servicePeriod
                        ? [`${invoice.servicePeriod.single ? labels.serviceDate : labels.servicePeriod} : ${invoice.servicePeriod.value}`]
                        : []),
                    ...(invoice.location ? [`${labels.location} : ${invoice.location}`] : []),
                ],
            });
            drawPositions(pdf, invoice);
            drawTotalsTable(pdf, invoice, invoice.earlyPayment);
        }
        drawConclusion(pdf, invoice);
        drawConditionsBlock(pdf, labels.paymentConditions, conditions, invoice.company.colors, invoice.paymentScale,
            invoice.company.layout === "CLASSIC" ? CLASSIC_CONDITIONS_GAP : undefined);
    }

    static renderDetails(pdf: PdfWriter, invoice: InvoiceDto) {
        const labels = PDF_LABELS[invoice.language];
        drawLetterDetails(pdf, invoice, `${labels.invoice} ${invoice.number} — ${invoice.client.name}`);
    }

}
