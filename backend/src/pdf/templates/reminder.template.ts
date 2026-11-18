import { PdfWriter } from "../core/pdf-writer";
import { ReminderDto } from "./reminder.types";
import { PDF_LABELS } from "./pdf-labels";
import { drawLetterHead } from "./business-letter";
import { drawModernHead } from "./modern-letter";

// Page 1 of a payment reminder: the invoice's own letterhead (business-
// letter.ts - header image or company name, logo, address, place/date, the
// title in the secondary color), then the reminder text (the company's own
// template, filled in from the invoice). The Swiss QR-bill goes on page 2
// (see reminder-pdf-generator.ts), so the client can pay straight from this
// document.
export class ReminderTemplate {

    static async render(pdf: PdfWriter, reminder: ReminderDto, logoBytes: Buffer | null, hasHeaderImage: boolean) {
        const { letter } = reminder;
        const labels = PDF_LABELS[letter.language];

        // The company's layout's own letterhead (business-letter.ts or modern-letter.ts).
        const draw = letter.company.layout === "MODERN" ? drawModernHead : drawLetterHead;
        await draw(pdf, letter, {
            title: `${labels.reminderTitle.toUpperCase()} ${letter.number}`,
            logoBytes,
            hasHeaderImage,
        });

        pdf.text(reminder.greeting, { size: 11, marginBottom: 10 });

        // The whole body is the company's own text (see reminder.dto.ts) -
        // pdf.text() already keeps its line breaks.
        pdf.text(reminder.text, { size: 11 });

        // No real signature yet - just the company's own name, standing in
        // for one (same as the invoice).
        pdf.text(letter.company.name, { size: 11, indent: 280, marginTop: 25 });
    }

}
