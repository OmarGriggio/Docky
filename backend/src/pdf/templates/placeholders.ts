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
export const fillPlaceholders = (text: string, values: Record<string, string>): string => {
    return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, name: string) => {
        return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match;
    });
};

export const formatLongDate = (value: Date): string => {
    return new Date(value).toLocaleDateString("fr-CH", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};
