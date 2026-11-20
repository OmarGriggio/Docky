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
    document_number: "numero_document",
    client_reference: "reference_client",
    amount_excl_vat: "montant_ht",
    vat_amount: "montant_tva",
    payment_terms: "conditions_paiement",
    client_name: "client",
    client_number: "numero_client",
    location: "lieu",
    company_address: "adresse_entreprise",
    company_phone: "telephone_entreprise",
    company_email: "email_entreprise",
    website: "site_web",
    bank_name: "banque",
    bank_account: "compte_bancaire",
    vat_number: "numero_tva",
};

const hasOwn = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);

export const fillPlaceholders = (text: string, values: Record<string, string>): string => {
    return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, name: string) => {
        const key = hasOwn(values, name) ? name : hasOwn(PLACEHOLDER_ALIASES, name) ? PLACEHOLDER_ALIASES[name] : null;
        return key !== null && hasOwn(values, key) ? values[key] : match;
    });
};
