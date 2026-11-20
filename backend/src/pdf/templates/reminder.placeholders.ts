import { formatLongDate } from "./pdf-labels";
import { buildDocumentValues, PlaceholderSource } from "./document.placeholders";

// The {{placeholders}} a company can use in its payment reminder text (its
// template's reminder_text): every document one (document.placeholders.ts),
// plus numero_facture (the invoice's number, like numero_document),
// date_facture and jours_retard - see fillPlaceholders (placeholders.ts) for
// how they're replaced.

// Whole days past the due date, never negative (0 = not overdue yet) - both
// sides reduced to their calendar day first, the time of day plays no part.
export const daysOverdue = (dueDate: Date, today: Date): number => {
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startOfDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
    return Math.max(0, Math.round((startOfToday - startOfDue) / 86400000));
};

export const buildReminderValues = (source: PlaceholderSource, today: Date): Record<string, string> => {
    const { document, language } = source;
    return {
        ...buildDocumentValues(source),
        numero_facture: document.number,
        date_facture: formatLongDate(document.date, language),
        // Empty (not "—"/"0") without a due date - the invoice has none to
        // be late against.
        jours_retard: document.due_date ? String(daysOverdue(document.due_date, today)) : "",
    };
};
