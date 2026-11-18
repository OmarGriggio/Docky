// Shared by every PDF whose text can contain {{placeholders}} (the payment
// reminder's, and the introduction/conclusion of invoices and quotes) -
// replaced by plain string substitution, no evaluation of any kind. What's
// allowed is exactly the keys of the `values` a caller passes in: an unknown
// {{name}} is left as typed, so a typo shows up in the PDF instead of
// silently vanishing.
//
// One pass over the text (a callback replace), so an inserted value is never
// itself scanned again - a client called "{{montant}}" stays as is.
// hasOwnProperty rather than `in`: a name like "constructor" also matches the
// pattern and must not resolve to something inherited.
//
// Every placeholder has an English name too, the one an English UI shows
// ({{amount}} for {{montant}}...) - either works in any text, whatever its
// language, so a text written before keeps working.
export const PLACEHOLDER_ALIASES: Record<string, string> = {
    client_title: "titre_client",
    amount: "montant",
    company_signature: "signature_entreprise",
    invoice_number: "numero_facture",
    invoice_date: "date_facture",
    due_date: "date_echeance",
    days_overdue: "jours_retard",
};

const hasOwn = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);

export const fillPlaceholders = (text: string, values: Record<string, string>): string => {
    return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, name: string) => {
        const key = hasOwn(values, name) ? name : hasOwn(PLACEHOLDER_ALIASES, name) ? PLACEHOLDER_ALIASES[name] : null;
        return key !== null && hasOwn(values, key) ? values[key] : match;
    });
};
