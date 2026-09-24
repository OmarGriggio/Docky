import { PDFImage } from "pdf-lib";
import { PdfWriter } from "../core/pdf-writer";
import { ReminderDto } from "./reminder.types";

const LOGO_MAX_WIDTH = 120;
const LOGO_MAX_HEIGHT = 60;
// Same soft look as the invoice's own logo (see invoice.template.ts).
const IMAGE_OPACITY = 0.65;

const formatLongDate = (value: Date): string => {
    return new Date(value).toLocaleDateString("fr-CH", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

// Page 1 of a payment reminder: same letter layout as the invoice/quote
// recap (company + logo, client, place and date), then the reminder text
// (the company's own template, filled in from the invoice). The Swiss QR-bill goes on page 2 (see
// pdf.service.ts), so the client can pay straight from this document.
export class ReminderTemplate {

    static async render(pdf: PdfWriter, reminder: ReminderDto, logoBytes: Buffer | null) {
        // Company address (left) and logo (right), side by side - same
        // approach as invoice.template.ts's own renderRecap.
        const topY = pdf.remainingHeight();
        pdf.text(reminder.company.name, { bold: true });
        pdf.text(reminder.company.street);
        pdf.text(reminder.company.postalCodeCity);

        if (logoBytes) {
            const logoBottomY = await this.drawLogoTopRight(pdf, logoBytes, topY);
            pdf.lowerCursorTo(logoBottomY);
        }
        pdf.lowerCursorTo(pdf.remainingHeight() - 20);

        pdf.text(reminder.client.name, { bold: true, indent: 250 });
        pdf.text(reminder.client.street, { indent: 250 });
        pdf.text(reminder.client.postalCodeCity, { indent: 250, marginBottom: 15 });

        pdf.text(reminder.company.city + ", le " + formatLongDate(reminder.date), { marginBottom: 25, indent: 250 });

        pdf.text(`Rappel - Facture N° ${reminder.invoiceNumber}`, { bold: true, size: 13, marginBottom: 15 });

        pdf.text(reminder.client.title, { marginBottom: 10 });

        // The whole body is the company's own text (see reminder.dto.ts) -
        // pdf.text() already keeps its line breaks.
        pdf.text(reminder.text);

        // No real signature yet - just the company's own name, standing in
        // for one (same as the invoice).
        pdf.text(reminder.company.name, { indent: 250, marginTop: 25 });
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
