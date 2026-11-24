import { PdfWriter } from "../core/pdf-writer";
import { ReminderDto } from "./reminder.types";
import { PDF_LABELS } from "./pdf-labels";
import { documentColorsOf, drawLetterHead } from "./business-letter";
import { drawModernHead } from "./modern-letter";
import { formatAmount } from "./format";

// Where the amounts block sits: from the middle of the page to the right margin.
const AMOUNTS_LEFT = 300;
const AMOUNTS_RIGHT = 545;
const AMOUNTS_ROW = 16;

// Page 1 of a payment reminder: the invoice's own letterhead (business-
// letter.ts - header image or company name, logo, address, place/date, the
// title of its level: "Rappel", "2e rappel", "Mise en demeure"), then its
// text (the template's own, filled in from the invoice) and, when it has
// fees, what's asked: the invoice's balance, the fees, the total its QR-bill
// asks for. The Swiss QR-bill goes on page 2 (see reminder-pdf-generator.ts),
// so the client can pay straight from this document.
export class ReminderTemplate {

    static async render(pdf: PdfWriter, reminder: ReminderDto, logoBytes: Buffer | null, hasHeaderImage: boolean) {
        const { letter } = reminder;
        const labels = PDF_LABELS[letter.language];

        // The company's layout's own letterhead (business-letter.ts or modern-letter.ts).
        const draw = letter.company.layout === "MODERN" ? drawModernHead : drawLetterHead;
        await draw(pdf, letter, {
            title: `${labels.reminderTitles[reminder.level].toUpperCase()} ${letter.number}`,
            logoBytes,
            hasHeaderImage,
        });

        pdf.text(reminder.greeting, { size: 11, marginBottom: 10 });

        // The whole body is the company's own text (see reminder.dto.ts) -
        // pdf.richText() keeps its line breaks, like pdf.text().
        pdf.richText(reminder.text, documentColorsOf(letter), { size: 11 });

        if (reminder.amounts) {
            ReminderTemplate.drawAmounts(pdf, reminder);
        }

        // No real signature yet - just the company's own name, standing in
        // for one (same as the invoice).
        pdf.text(letter.company.name, { size: 11, indent: 280, marginTop: 25 });
    }

    // The invoice's balance, the fees, then the total between a rule and the
    // end - kept in one piece. The total takes the currency when the
    // template shows it, like the invoice's.
    private static drawAmounts(pdf: PdfWriter, reminder: ReminderDto) {
        const { letter, amounts } = reminder;
        const labels = PDF_LABELS[letter.language];
        if (!amounts) {
            return;
        }
        const total = formatAmount(amounts.total);
        const rows = [
            { label: labels.reminderInvoiceBalance(letter.number), value: formatAmount(amounts.balance), bold: false },
            { label: labels.reminderFees, value: formatAmount(amounts.fees), bold: false },
            { label: labels.reminderTotal, value: letter.currency ? `${letter.currency} ${total}` : total, bold: true },
        ];
        pdf.moveDown(14);
        pdf.reserve(rows.length * AMOUNTS_ROW + 8);
        rows.forEach((row, index) => {
            if (index === rows.length - 1) {
                // A little under the fees' descenders, a little over the total.
                pdf.moveDown(3);
                const ruleY = pdf.remainingHeight() + 3;
                pdf.drawLineAt({ x: AMOUNTS_LEFT, y: ruleY }, { x: AMOUNTS_RIGHT, y: ruleY }, 0.75);
                pdf.moveDown(4);
            }
            const y = pdf.remainingHeight() - 10;
            pdf.drawTextAt(row.label, AMOUNTS_LEFT, y, { size: 10.5, bold: row.bold });
            pdf.drawTextRightAt(row.value, AMOUNTS_RIGHT, y, { size: 10.5, bold: row.bold });
            pdf.moveDown(AMOUNTS_ROW);
        });
    }

}
