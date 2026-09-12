import { PDFImage } from "pdf-lib";
import { PdfWriter } from "../core/pdf-writer";
import { PdfTable } from "../core/pdf-writer.types";
import { QuoteDto, QuoteSectionDto } from "./quote.types";

const LOGO_MAX_WIDTH = 120;
const LOGO_MAX_HEIGHT = 60;

// Mirrors InvoiceTemplate (invoice.template.ts) - same layout, but titled
// "Offre", with an optional validity date instead of payment info, and no
// Swiss QR-bill page (nothing to pay yet on a quote).
export class QuoteTemplate {

    static async render(pdf: PdfWriter, quote: QuoteDto, logoBytes: Buffer | null) {
        const date = new Date(quote.date).toLocaleDateString("fr-CH", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        if (logoBytes) {
            await this.drawLogo(pdf, logoBytes);
        }

        pdf.title(`Offre ${quote.number}`);

        pdf.text(quote.company.name, { bold: true });
        pdf.text(quote.company.street);
        pdf.text(quote.company.postalCodeCity, { marginBottom: 30 });

        pdf.text(quote.client.name, { bold: true, indent: 250 });
        pdf.text(quote.client.street, { indent: 250 });
        pdf.text(quote.client.postalCodeCity, { indent: 250, marginBottom: 15 });

        pdf.text(quote.company.city + ", le " + date, { marginBottom: 10, indent: 250 });

        pdf.text(quote.client.title, { marginBottom: 5 });

        pdf.text(quote.introduction, { marginBottom: 15 });

        for (const section of quote.sections) {
            pdf.text(section.title, { bold: true, size: 12, marginTop: 10, marginBottom: section.description ? 2 : 4 });
            if (section.description) {
                pdf.text(section.description, { size: 10, marginBottom: 4 });
            }
            pdf.table(this.createSectionTable(section));
        }

        pdf.line();

        pdf.text(`Total HT : ${quote.amountExclVat.toFixed(2)} CHF`, { bold: true, marginTop: 15 });
        pdf.text(`Total TTC : ${quote.amountInclVat.toFixed(2)} CHF`, { bold: true, marginBottom: 20 });

        if (quote.validUntil) {
            const validUntil = new Date(quote.validUntil).toLocaleDateString("fr-CH", {
                day: "numeric",
                month: "long",
                year: "numeric",
            });
            pdf.text(`Offre valable jusqu'au ${validUntil}`, { marginBottom: 15 });
        }

        pdf.text(quote.conclusion);

        pdf.text(quote.company.name, { indent: 250, marginTop: 20 });
    };

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

    private static async drawLogo(pdf: PdfWriter, logoBytes: Buffer) {
        const image = await this.embedLogo(pdf, logoBytes);
        if (!image) return;

        const scale = Math.min(LOGO_MAX_WIDTH / image.width, LOGO_MAX_HEIGHT / image.height, 1);
        pdf.drawImageCentered(image, image.width * scale, image.height * scale, 15);
    }

    /** The logo file may be a JPEG or a PNG; try both embedders rather than trusting the file extension. */
    private static async embedLogo(pdf: PdfWriter, logoBytes: Buffer): Promise<PDFImage | null> {
        try {
            return await pdf.embedJpg(logoBytes);
        } catch {
            try {
                return await pdf.embedPng(logoBytes);
            } catch {
                return null;
            }
        }
    }

}
