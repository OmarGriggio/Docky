import { formatLongDate, PDF_LABELS, PdfLanguage } from "./pdf-labels";

// What a client with no title (clients.title NULL/blank) is greeted with -
// the same fallback the document form's own preview uses. In the client's
// own language on the PDF (see pdf-labels.ts).
export const DEFAULT_CLIENT_TITLE = PDF_LABELS.FR.defaultClientTitle;

// The {{placeholders}} available in an invoice's or quote's introduction and
// conclusion: {{titre_client}} (no trailing comma - the text supplies it, see
// DEFAULT_DOCUMENT_INTRODUCTION), {{date}} (the document's own), {{montant}}
// (its total incl. VAT, the same figure as its "Total TTC") and
// {{signature_entreprise}} (the company's name, standing in for a real
// signature for now).
export const buildDocumentValues = (
    document: { date: Date; amount_incl_vat: number },
    clientTitle: string | null,
    companyName: string | null,
    language: PdfLanguage = "FR"
): Record<string, string> => {
    return {
        titre_client: clientTitle?.trim() || PDF_LABELS[language].defaultClientTitle,
        date: formatLongDate(document.date, language),
        montant: `${document.amount_incl_vat.toFixed(2)} CHF`,
        signature_entreprise: companyName ?? "",
    };
};
