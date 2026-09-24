import { formatLongDate } from "./placeholders";

// The {{placeholders}} a company can use in its payment reminder text (a
// document_templates row of type REMINDER): numero_facture, date_facture,
// date_echeance, montant, jours_retard, client, signature_entreprise - see fillPlaceholders
// (placeholders.ts) for how they're replaced.

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
    companyName: string,
    today: Date
): Record<string, string> => {
    return {
        numero_facture: invoice.number,
        date_facture: formatLongDate(invoice.date),
        // Empty (not "—"/"0") without a due date - the invoice has none to
        // be late against.
        date_echeance: invoice.due_date ? formatLongDate(invoice.due_date) : "",
        montant: `${invoice.amount_incl_vat.toFixed(2)} CHF`,
        jours_retard: invoice.due_date ? String(daysOverdue(invoice.due_date, today)) : "",
        client: clientName,
        signature_entreprise: companyName,
    };
};
