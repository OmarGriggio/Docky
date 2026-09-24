import { formatLongDate } from "./placeholders";

// What a client with no title (clients.title NULL/blank) is greeted with -
// the same fallback the document form's own preview uses.
export const DEFAULT_CLIENT_TITLE = "Madame, Monsieur";

// The {{placeholders}} available in an invoice's or quote's introduction and
// conclusion: {{titre_client}} (no trailing comma - the text supplies it, see
// DEFAULT_DOCUMENT_INTRODUCTION), {{date}} (the document's own), {{montant}}
// (its total incl. VAT, the same figure as its "Total TTC") and
// {{signature_entreprise}} (the company's name, standing in for a real
// signature for now).
export const buildDocumentValues = (
    document: { date: Date; amount_incl_vat: number },
    clientTitle: string | null,
    companyName: string | null
): Record<string, string> => {
    return {
        titre_client: clientTitle?.trim() || DEFAULT_CLIENT_TITLE,
        date: formatLongDate(document.date),
        montant: `${document.amount_incl_vat.toFixed(2)} CHF`,
        signature_entreprise: companyName ?? "",
    };
};
