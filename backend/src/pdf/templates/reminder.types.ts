import { LetterDto } from "./business-letter";
import { TextRun } from "./rich-text";
import { BilledAddress } from "../../modules/documents/document.types";

// Which reminder of an invoice is printed: one already sent
// (invoice_reminders - everything as it went out) or the next one, previewed
// (its template's text, today, the client's current address).
export interface ReminderToPrint {
    level: 1 | 2 | 3;
    // The letter's date - and what {{jours_retard}} counts to.
    date: Date;
    // Its text, raw ({{placeholders}} filled in when printed).
    text: string;
    // This level's fee and every reminder's so far, this one included (CHF).
    fee: number;
    totalFees: number;
    // What the invoice still asked for when it was sent - left out: what it
    // asks for now (a final invoice's deposits deducted).
    amountDue?: number;
    // The address it was sent to - left out: the client's current one (a
    // client may have moved since the invoice was sent). Null: none frozen.
    billedAddress?: BilledAddress | null;
}

// A payment reminder for an already-sent, unpaid invoice, laid out like the
// invoice itself (business-letter.ts: header image, colors, footer). The
// body is its level's text (the template's own, or the default), already
// filled in with the invoice's data - see reminder.placeholders.ts.
export interface ReminderDto {
    // The invoice's letter, dated the reminder's day - its client address,
    // reference and company details are the invoice's.
    letter: LetterDto;
    level: 1 | 2 | 3;
    // "Madame, Monsieur", or the client's own title.
    greeting: string;
    // Styled by the author (rich-text.ts), placeholders already filled in.
    text: TextRun[];
    // The amounts block under the text - only when the reminder has fees:
    // the invoice's balance, the fees, what the QR-bill asks for.
    amounts: { balance: number; fees: number; total: number } | null;
}
