import { LetterDto } from "./business-letter";

// A payment reminder for an already-sent, unpaid invoice, laid out like the
// invoice itself (business-letter.ts: header image, colors, footer). The
// body is the company's own REMINDER template (or the default), already
// filled in with the invoice's data - see reminder.placeholders.ts.
export interface ReminderDto {
    // The invoice's letter, dated today (the reminder's own issue date) -
    // its client address, reference and company details are the invoice's.
    letter: LetterDto;
    // "Madame, Monsieur", or the client's own title.
    greeting: string;
    text: string;
}
