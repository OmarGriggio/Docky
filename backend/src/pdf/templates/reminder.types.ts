import { ClientDto, CompanyDto } from "./document.types";
import { PdfLanguage } from "./pdf-labels";

// A payment reminder for an already-sent, unpaid invoice. The body is the
// company's own REMINDER template (or the default), already filled in with
// the invoice's data - see reminder.placeholders.ts.
export interface ReminderDto {
    language: PdfLanguage;
    invoiceNumber: string;
    // The reminder's own issue date (today), distinct from the invoice's.
    date: Date;
    company: CompanyDto;
    client: ClientDto & {
        title: string;
    };
    text: string;
}
