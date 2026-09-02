import { blob } from "stream/consumers";
import { PDFImage } from "pdf-lib";
import { PdfWriter } from "../core/pdf-writer";
import { PdfTable } from "../core/pdf-writer.types";
import { InvoiceDto } from "./invoice.types";

const LOGO_MAX_WIDTH = 120;
const LOGO_MAX_HEIGHT = 60;

export class InvoiceTemplate {

    static async render(pdf: PdfWriter, invoice: InvoiceDto, logoBytes: Buffer | null) {
        const date = new Date(invoice.date).toLocaleDateString("fr-CH", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        const table = this.createLinesTable(invoice);

        if (logoBytes) {
            await this.drawLogo(pdf, logoBytes);
        }

        pdf.title(`Facture ${invoice.number}`);

        pdf.text(invoice.company.name, {bold: true});
        pdf.text(invoice.company.street);
        pdf.text(invoice.company.postalCodeCity, {marginBottom: 30});

        pdf.text(invoice.client.name, { bold: true, indent:250 });
        pdf.text(invoice.client.street, {indent:250});
        pdf.text(invoice.client.postalCodeCity, {indent:250, marginBottom: 15});

        pdf.text(invoice.company.city + ", le " + date, {marginBottom: 10, indent:250});

        pdf.text(invoice.client.title, {marginBottom: 5});

        //TODO: add to the document table
        pdf.text(invoice.introduction);

        pdf.table(table);
        pdf.line();

        pdf.text(`Total HT : ${invoice.amountExclVat.toFixed(2)} CHF`, { bold: true, marginTop: 15 });
        pdf.text(`Total TTC : ${invoice.amountInclVat.toFixed(2)} CHF`, { bold: true, marginBottom: 20 });

        pdf.text(invoice.conclusion);

        pdf.text(invoice.company.name, {indent: 250, marginTop: 20})
    };

    private static createLinesTable(invoice: InvoiceDto): PdfTable {
        return{
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
            rows: invoice.lines.map(line => ({
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
