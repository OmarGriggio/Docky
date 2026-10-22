import { PdfWriter } from "../core/pdf-writer";
import { InvoiceDto } from "./invoice.types";
import { formatLongDate, PDF_LABELS } from "./pdf-labels";
import { drawHeaderImage, drawLetterHead, drawSectionDetails, drawTotals } from "./letter";

// Page 1: a recap only - who/what/when, one line per section's own total,
// the grand totals, payment terms/conclusion/signature. Page 2+: the full
// itemized detail (every section's own lines), rendered by renderDetails
// below - see invoice-pdf-generator.ts for how the two are stitched together
// (and where the Swiss QR-bill lands after that).
export class InvoiceTemplate {

    static async renderRecap(pdf: PdfWriter, invoice: InvoiceDto, logoBytes: Buffer | null, headerImageBytes: Buffer | null) {
        const labels = PDF_LABELS[invoice.language];

        // The company's own document header image, if it has one - drawn
        // into the page's own top margin band (an absolute position, not
        // the flowing cursor), so it doesn't push the rest of the recap
        // down or shrink its usable space.
        if (headerImageBytes) {
            await drawHeaderImage(pdf, headerImageBytes);
        }

        await drawLetterHead(pdf, {
            company: invoice.company,
            client: invoice.client,
            date: invoice.date,
            language: invoice.language,
            logoBytes,
            companyExtraLines: invoice.company.vatNumber ? [`${labels.vatNumber} : ${invoice.company.vatNumber}`] : [],
        });

        // No page title here - "Facture N° ..." below already says what
        // this document is, a lone "Facture" heading above it said nothing
        // new.
        pdf.text(`${labels.invoiceNumber} ${invoice.number}`, { bold: true, marginBottom: 10 });

        pdf.text(invoice.introduction, { marginBottom: 15 });

        if (invoice.referenceClient) {
            pdf.text(`${labels.clientReference} : ${invoice.referenceClient}`, { marginBottom: 4 });
        }
        if (invoice.location) {
            pdf.text(`${labels.location} : ${invoice.location}`, { marginBottom: 4 });
        }

        drawTotals(pdf, invoice);

        if (invoice.dueDate) {
            pdf.text(`${labels.dueDate} : ${formatLongDate(invoice.dueDate, invoice.language)}`, { bold: true, marginBottom: 6 });
        }

        if (invoice.paymentTerms) {
            pdf.text(invoice.paymentTerms, { marginBottom: 15 });
        }

        // The signature (for now just the company's name) is part of the
        // conclusion text itself now - {{signature_entreprise}}, see
        // invoice.dto.ts.
        pdf.text(invoice.conclusion);
    }

    static renderDetails(pdf: PdfWriter, invoice: InvoiceDto) {
        const labels = PDF_LABELS[invoice.language];
        drawSectionDetails(pdf, `${labels.invoice} ${invoice.number} — ${invoice.client.name}`, invoice.sections, invoice.language);
    }

}
