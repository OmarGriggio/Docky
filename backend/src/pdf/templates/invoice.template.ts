import { PDFImage } from "pdf-lib";
import { PdfWriter } from "../core/pdf-writer";
import { PdfTable } from "../core/pdf-writer.types";
import { InvoiceDto, InvoiceSectionDto } from "./invoice.types";

const LOGO_MAX_WIDTH = 120;
const LOGO_MAX_HEIGHT = 60;
// Applied to the logo and the header image - a soft watermark-like look
// rather than flat, opaque artwork.
const IMAGE_OPACITY = 0.65;

// Page 1: a recap only - who/what/when, one line per section's own total,
// the grand totals, payment terms/conclusion/signature. Page 2+: the full
// itemized detail (every section's own lines), rendered by renderDetails
// below - see pdf.service.ts for how the two are stitched together (and
// where the Swiss QR-bill lands after that).
export class InvoiceTemplate {

    static async renderRecap(pdf: PdfWriter, invoice: InvoiceDto, logoBytes: Buffer | null, headerImageBytes: Buffer | null) {
        // The company's own document header image, if it has one - drawn
        // into the page's own top margin band (an absolute position, not
        // the flowing cursor), so it doesn't push the rest of the recap
        // down or shrink its usable space.
        if (headerImageBytes) {
            await this.drawHeaderImage(pdf, headerImageBytes);
        }

        const date = new Date(invoice.date).toLocaleDateString("fr-CH", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        // No page title here - "Facture N° ..." below already says what
        // this document is, a lone "Facture" heading above it said nothing
        // new.

        // Company address (left) and logo (right), side by side - drawn
        // independently (the logo via an absolute position, not the
        // flowing cursor), then the cursor is lowered past whichever of
        // the two ends up taller before anything else is written.
        const topY = pdf.remainingHeight();
        pdf.text(invoice.company.name, { bold: true });
        pdf.text(invoice.company.street);
        pdf.text(invoice.company.postalCodeCity);
        if (invoice.company.vatNumber) {
            pdf.text(`N° TVA : ${invoice.company.vatNumber}`);
        }

        if (logoBytes) {
            const logoBottomY = await this.drawLogoTopRight(pdf, logoBytes, topY);
            pdf.lowerCursorTo(logoBottomY);
        }
        pdf.lowerCursorTo(pdf.remainingHeight() - 20);

        pdf.text(invoice.client.name, { bold: true, indent: 250 });
        pdf.text(invoice.client.street, { indent: 250 });
        pdf.text(invoice.client.postalCodeCity, { indent: 250, marginBottom: 15 });

        pdf.text(invoice.company.city + ", le " + date, { marginBottom: 15, indent: 250 });

        pdf.text(`Facture N° ${invoice.number}`, { bold: true, marginBottom: 10 });

        pdf.text(invoice.client.title, { marginBottom: 5 });

        pdf.text(invoice.introduction, { marginBottom: 15 });

        if (invoice.referenceClient) {
            pdf.text(`Référence client : ${invoice.referenceClient}`, { marginBottom: 4 });
        }
        if (invoice.location) {
            pdf.text(`Lieu/Bâtiment : ${invoice.location}`, { marginBottom: 4 });
        }

        pdf.text("Récapitulatif", { bold: true, size: 12, marginTop: 10, marginBottom: 6 });
        for (const section of invoice.sections) {
            pdf.text(`${section.title} : ${this.sectionTotal(section).toFixed(2)} CHF`, { marginBottom: 2 });
        }

        pdf.line();

        if (invoice.discount > 0) {
            pdf.text(`Rabais : ${invoice.discount}%`, { marginTop: 10 });
        }
        pdf.text(`Total HT : ${invoice.amountExclVat.toFixed(2)} CHF`, { marginTop: invoice.discount > 0 ? 0 : 10 });
        if (invoice.vatRate > 0) {
            pdf.text(`TVA ${invoice.vatRate}% : ${(invoice.amountInclVat - invoice.amountExclVat).toFixed(2)} CHF`);
        }
        pdf.text(`Total TTC : ${invoice.amountInclVat.toFixed(2)} CHF`, { bold: true, marginBottom: 20 });

        if (invoice.paymentTerms) {
            pdf.text(invoice.paymentTerms, { marginBottom: 15 });
        }

        pdf.text(invoice.conclusion);

        // No real signature yet (see the class comment) - just the
        // company's own name, standing in for one.
        pdf.text(invoice.company.name, { indent: 250, marginTop: 20 });
    }

    // The full itemized breakdown - every section's own lines, in a table.
    // Repeats a small "Facture N° X — Client" header at the top so a page
    // landed on mid-invoice (via the table's own automatic page overflow,
    // or simply because this is the second physical page) still reads on
    // its own.
    static renderDetails(pdf: PdfWriter, invoice: InvoiceDto) {
        pdf.text(`Facture ${invoice.number} — ${invoice.client.name}`, { bold: true, marginBottom: 15 });

        for (const section of invoice.sections) {
            pdf.text(section.title, { bold: true, size: 12, marginTop: 10, marginBottom: section.description ? 2 : 4 });
            if (section.description) {
                pdf.text(section.description, { size: 10, marginBottom: 4 });
            }
            pdf.table(this.createSectionTable(section));
            pdf.text(`Total ${section.title} : ${this.sectionTotal(section).toFixed(2)} CHF`, { bold: true, marginTop: 4 });
        }
    }

    private static sectionTotal(section: InvoiceSectionDto): number {
        return section.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    }

    private static createSectionTable(section: InvoiceSectionDto): PdfTable {
        return {
            columns: [
                {
                    key: "description",
                    title: "Description",
                    width: 260,
                },
                {
                    key: "quantity",
                    title: "Qté",
                    width: 60,
                },
                {
                    key: "price",
                    title: "Prix",
                    width: 80,
                },
                {
                    key: "total",
                    title: "Total",
                    width: 80,
                },
            ],
            rows: section.lines.map(line => ({
                description: line.label,
                quantity: line.unit ? `${line.quantity} ${line.unit}` : `${line.quantity}`,
                price: `${line.unitPrice.toFixed(2)} CHF`,
                total: `${(line.quantity * line.unitPrice).toFixed(2)} CHF`,
            })),
        };
    }

    /** Draws the logo at the top-right corner (not centered) and returns the Y of its own bottom edge, so the caller can lower the flowing cursor past it. */
    private static async drawLogoTopRight(pdf: PdfWriter, logoBytes: Buffer, topY: number): Promise<number> {
        const image = await this.embedImage(pdf, logoBytes);
        if (!image) return topY;

        const scale = Math.min(LOGO_MAX_WIDTH / image.width, LOGO_MAX_HEIGHT / image.height, 1);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = pdf.pageWidth() - pdf.marginValue() - width;
        const y = topY - height;

        pdf.drawImage(image, x, y, width, height, IMAGE_OPACITY);
        return y;
    }

    /** Draws the company's document header image flush against the page's top edge, sized to fit within the default top margin (never taller than it), centered horizontally - an absolute position, entirely independent of the flowing cursor. */
    private static async drawHeaderImage(pdf: PdfWriter, headerImageBytes: Buffer) {
        const image = await this.embedImage(pdf, headerImageBytes);
        if (!image) return;

        const margin = pdf.marginValue();
        const maxWidth = pdf.pageWidth() - margin * 2;
        const scale = Math.min(maxWidth / image.width, margin / image.height, 1);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (pdf.pageWidth() - width) / 2;
        const y = pdf.pageHeight() - height;

        pdf.drawImage(image, x, y, width, height, IMAGE_OPACITY);
    }

    /** The image file may be a JPEG or a PNG; try both embedders rather than trusting the file extension. */
    private static async embedImage(pdf: PdfWriter, imageBytes: Buffer): Promise<PDFImage | null> {
        try {
            return await pdf.embedJpg(imageBytes);
        } catch {
            try {
                return await pdf.embedPng(imageBytes);
            } catch {
                return null;
            }
        }
    }

}
