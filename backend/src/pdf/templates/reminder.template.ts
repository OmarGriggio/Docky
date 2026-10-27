import { PdfWriter } from "../core/pdf-writer";
import { ReminderDto } from "./reminder.types";
import { PDF_LABELS } from "./pdf-labels";
import { drawReminderLetterHead } from "./letter";

// Page 1 of a payment reminder: a classic letterhead (company + logo,
// client, place and date - not the invoice/quote layout of
// business-letter.ts), then the reminder text
// (the company's own template, filled in from the invoice). The Swiss QR-bill goes on page 2 (see
// reminder-pdf-generator.ts), so the client can pay straight from this document.
export class ReminderTemplate {

    static async render(pdf: PdfWriter, reminder: ReminderDto, logoBytes: Buffer | null) {
        const labels = PDF_LABELS[reminder.language];

        await drawReminderLetterHead(pdf, {
            company: reminder.company,
            client: reminder.client,
            date: reminder.date,
            language: reminder.language,
            logoBytes,
            dateMarginBottom: 25,
        });

        pdf.text(`${labels.reminderTitle} ${reminder.invoiceNumber}`, { bold: true, size: 13, marginBottom: 15 });

        pdf.text(reminder.client.title.trim() || labels.defaultClientTitle, { marginBottom: 10 });

        // The whole body is the company's own text (see reminder.dto.ts) -
        // pdf.text() already keeps its line breaks.
        pdf.text(reminder.text);

        // No real signature yet - just the company's own name, standing in
        // for one (same as the invoice).
        pdf.text(reminder.company.name, { indent: 250, marginTop: 25 });
    }

}
