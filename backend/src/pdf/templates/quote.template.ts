import { PDFImage } from "pdf-lib";
import { PdfWriter } from "../core/pdf-writer";
import { PdfTable } from "../core/pdf-writer.types";
import { QuoteDto, QuoteSectionDto } from "./quote.types";

const LOGO_MAX_WIDTH = 120;
const LOGO_MAX_HEIGHT = 60;
// Same soft look as the invoice's own logo (see invoice.template.ts).
const IMAGE_OPACITY = 0.65;

// Mirrors InvoiceTemplate (invoice.template.ts) - same page 1
// recap/page 2 detail split, titled "Offre" with an optional validity date
// instead of payment terms. Deliberately without: VAT/discount (a quote has
// neither - see document-form.html, both are INVOICE-only fields), a
// Lieu/Bâtiment (quote.dto.ts's own resolveBillingAddress always uses the
// client's plain billing address), the company's own VAT number (not a
// legal requirement before this becomes a real invoice), and the Swiss
// QR-bill page (nothing to pay yet on a quote).
export class QuoteTemplate {

    static async renderRecap(pdf: PdfWriter, quote: QuoteDto, logoBytes: Buffer | null) {
        const date = new Date(quote.date).toLocaleDateString("fr-CH", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        // Company address (left) and logo (right), side by side - same
        // approach as invoice.template.ts's own renderRecap.
        const topY = pdf.remainingHeight();
        pdf.text(quote.company.name, { bold: true });
        pdf.text(quote.company.street);
        pdf.text(quote.company.postalCodeCity);

        if (logoBytes) {
            const logoBottomY = await this.drawLogoTopRight(pdf, logoBytes, topY);
            pdf.lowerCursorTo(logoBottomY);
        }
        pdf.lowerCursorTo(pdf.remainingHeight() - 20);

        pdf.text(quote.client.name, { bold: true, indent: 250 });
        pdf.text(quote.client.street, { indent: 250 });
        pdf.text(quote.client.postalCodeCity, { indent: 250, marginBottom: 15 });

        pdf.text(quote.company.city + ", le " + date, { marginBottom: 15, indent: 250 });

        pdf.text(`Offre N° ${quote.number}`, { bold: true, marginBottom: 10 });

        pdf.text(quote.introduction, { marginBottom: 15 });

        pdf.text("Récapitulatif", { bold: true, size: 12, marginTop: 10, marginBottom: 6 });
        for (const section of quote.sections) {
            pdf.text(`${section.title} : ${this.sectionTotal(section).toFixed(2)} CHF`, { marginBottom: 2 });
        }

        pdf.line();

        pdf.text(`Total : ${this.quoteTotal(quote).toFixed(2)} CHF`, { bold: true, marginTop: 10, marginBottom: 20 });

        if (quote.validUntil) {
            const validUntil = new Date(quote.validUntil).toLocaleDateString("fr-CH", {
                day: "numeric",
                month: "long",
                year: "numeric",
            });
            pdf.text(`Offre valable jusqu'au ${validUntil}`, { marginBottom: 15 });
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
        pdf.text("Bon pour accord", { bold: true, marginTop: 30, marginBottom: 25 });

        const rowY = pdf.remainingHeight();
        const margin = pdf.marginValue();
        pdf.drawTextAt("Date :", margin, rowY);
        this.drawSignatureLine(pdf, margin + 35, rowY - 3, 140);

        pdf.drawTextAt("Signature :", margin + 250, rowY);
        this.drawSignatureLine(pdf, margin + 250 + 62, rowY - 3, 160);

        pdf.lowerCursorTo(rowY - 15);
    }

    /** A short blank line to sign/date on, drawn by absolute position - independent of the flowing cursor, which the caller is responsible for advancing past afterwards. */
    private static drawSignatureLine(pdf: PdfWriter, x: number, y: number, width: number) {
        pdf.drawLineAt({ x, y }, { x: x + width, y }, 0.5);
    }

    // The full itemized breakdown - every section's own lines, in a table,
    // plus that section's own total. Repeats a small "Offre N° X — Client"
    // header at the top, same reasoning as invoice.template.ts's own
    // renderDetails.
    static renderDetails(pdf: PdfWriter, quote: QuoteDto) {
        pdf.text(`Offre ${quote.number} — ${quote.client.name}`, { bold: true, marginBottom: 15 });

        for (const section of quote.sections) {
            pdf.text(section.title, { bold: true, size: 12, marginTop: 10, marginBottom: section.description ? 2 : 4 });
            if (section.description) {
                pdf.text(section.description, { size: 10, marginBottom: 4 });
            }
            pdf.table(this.createSectionTable(section));
            pdf.text(`Total ${section.title} : ${this.sectionTotal(section).toFixed(2)} CHF`, { bold: true, marginTop: 4 });
        }

        // The company's own default payment terms (see quote.dto.ts) -
        // informational only, a quote has no payment obligation of its own
        // yet, but the client should still know them upfront.
        if (quote.paymentTerms) {
            pdf.text(quote.paymentTerms, { marginTop: 20 });
        }
    }

    private static sectionTotal(section: QuoteSectionDto): number {
        return section.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    }

    // No VAT/discount on a quote (see the class comment) - just the flat
    // sum of every section's own total.
    private static quoteTotal(quote: QuoteDto): number {
        return quote.sections.reduce((sum, section) => sum + this.sectionTotal(section), 0);
    }

    private static createSectionTable(section: QuoteSectionDto): PdfTable {
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
