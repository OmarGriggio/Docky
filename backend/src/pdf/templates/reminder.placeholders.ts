// The {{placeholders}} a company can use in its payment reminder text (a
// document_templates row of type REMINDER) - a fixed whitelist, replaced by
// plain string substitution at PDF time (no evaluation of any kind). An
// unknown {{name}} is left exactly as typed, so a typo shows up in the PDF
// instead of silently vanishing.
export const REMINDER_PLACEHOLDERS = [
    "numero_facture",
    "date_facture",
    "date_echeance",
    "montant",
    "jours_retard",
    "client",
] as const;

export type ReminderPlaceholder = typeof REMINDER_PLACEHOLDERS[number];

// One pass over the template (a callback replace), so an inserted value is
// never itself scanned again - a client called "{{montant}}" stays as is.
export const fillPlaceholders = (text: string, values: Record<ReminderPlaceholder, string>): string => {
    return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, name: string) => {
        return (REMINDER_PLACEHOLDERS as readonly string[]).includes(name)
            ? values[name as ReminderPlaceholder]
            : match;
    });
};

const formatLongDate = (value: Date): string => {
    return new Date(value).toLocaleDateString("fr-CH", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

// Whole days past the due date, never negative (0 = not overdue yet) - both
// sides reduced to their calendar day first, the time of day plays no part.
export const daysOverdue = (dueDate: Date, today: Date): number => {
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startOfDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
    return Math.max(0, Math.round((startOfToday - startOfDue) / 86400000));
};

export const buildReminderValues = (
    invoice: { number: string; date: Date; due_date: Date | null; amount_incl_vat: number },
    clientName: string,
    today: Date
): Record<ReminderPlaceholder, string> => {
    return {
        numero_facture: invoice.number,
        date_facture: formatLongDate(invoice.date),
        // Empty (not "—"/"0") without a due date - the invoice has none to
        // be late against.
        date_echeance: invoice.due_date ? formatLongDate(invoice.due_date) : "",
        montant: `${invoice.amount_incl_vat.toFixed(2)} CHF`,
        jours_retard: invoice.due_date ? String(daysOverdue(invoice.due_date, today)) : "",
        client: clientName,
    };
};
