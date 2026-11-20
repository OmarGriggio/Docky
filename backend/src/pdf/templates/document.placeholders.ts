import { formatLongDate, PDF_LABELS, PdfLanguage } from "./pdf-labels";

// What a client with no title (clients.title NULL/blank) is greeted with -
// the same fallback the document form's own preview uses. In the client's
// own language on the PDF (see pdf-labels.ts).
export const DEFAULT_CLIENT_TITLE = PDF_LABELS.FR.defaultClientTitle;

// Everything a document's texts can quote - an introduction, a conclusion,
// a reminder's text (placeholderSourceOf in dto/shared.ts builds it).
export interface PlaceholderSource {
    document: {
        number: string;
        date: Date;
        due_date: Date | null;
        reference_client: string | null;
        amount_excl_vat: number;
        amount_incl_vat: number;
        payment_terms: string | null;
    };
    // What {{montant}} says: a final invoice's balance, not its whole total
    // (see deposit.ts) - the document's total incl. VAT otherwise.
    amountDue: number;
    client: { title: string | null; name: string; number: string | null; location: string | null };
    company: {
        name: string | null; street: string | null; postal_code: string | null; city: string | null;
        phone: string | null; email: string | null; website: string | null; iban: string | null;
        bank_name: string | null; bank_account: string | null; vat_number: string | null;
    };
    language: PdfLanguage;
}

const amount = (value: number) => `${Number(value).toFixed(2)} CHF`;

/**
 * The {{placeholders}} every document text can use, by their French name
 * (each has an English one too - placeholders.ts's PLACEHOLDER_ALIASES).
 * {{titre_client}} has no trailing comma (the text supplies it), the
 * client's language's "Madame, Monsieur" without a title; {{montant}} is
 * what's due incl. VAT, {{montant_ht}}/{{montant_tva}} the document's own
 * total excl. VAT and its VAT; {{signature_entreprise}} the company's name,
 * standing in for a real signature for now. Anything not set is empty,
 * never "null".
 */
export const buildDocumentValues = ({ document, amountDue, client, company, language }: PlaceholderSource): Record<string, string> => {
    const text = (value: string | null | undefined) => value?.trim() ?? "";
    return {
        numero_document: document.number,
        date: formatLongDate(document.date, language),
        date_echeance: document.due_date ? formatLongDate(document.due_date, language) : "",
        reference_client: text(document.reference_client),
        montant: amount(amountDue),
        montant_ht: amount(document.amount_excl_vat),
        montant_tva: amount(Number(document.amount_incl_vat) - Number(document.amount_excl_vat)),
        conditions_paiement: text(document.payment_terms),
        titre_client: text(client.title) || PDF_LABELS[language].defaultClientTitle,
        client: client.name,
        numero_client: text(client.number),
        lieu: text(client.location),
        signature_entreprise: text(company.name),
        adresse_entreprise: [text(company.street), `${text(company.postal_code)} ${text(company.city)}`.trim()].filter(Boolean).join(", "),
        telephone_entreprise: text(company.phone),
        email_entreprise: text(company.email),
        site_web: text(company.website),
        iban: text(company.iban),
        banque: text(company.bank_name),
        compte_bancaire: text(company.bank_account),
        numero_tva: text(company.vat_number),
    };
};
