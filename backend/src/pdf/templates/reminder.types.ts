// A payment reminder for an already-sent, unpaid invoice. The body is the
// company's own REMINDER template (or the default), already filled in with
// the invoice's data - see reminder.placeholders.ts.
export interface ReminderDto {
    invoiceNumber: string;
    // The reminder's own issue date (today), distinct from the invoice's.
    date: Date;
    company: {
        name: string;
        street: string;
        city: string;
        postalCodeCity: string;
        logo: string | null;
    };
    client: {
        name: string;
        street: string;
        city: string;
        postalCodeCity: string;
        title: string;
    };
    text: string;
}
