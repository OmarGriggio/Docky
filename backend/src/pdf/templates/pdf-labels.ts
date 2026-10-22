import { ClientLanguage } from "../../modules/clients/client.types";

// The language a PDF is printed in - the client's own (clients.language), not
// the logged-in user's UI language: it's the client who reads it. Only FR/EN
// have labels so far, same scope as the frontend's Transloco; a DE/IT client
// falls back to French (the language of company 1's own region).
export type PdfLanguage = "FR" | "EN";

export const toPdfLanguage = (language: ClientLanguage | null | undefined): PdfLanguage => {
    return language === "EN" ? "EN" : "FR";
};

const LOCALES: Record<PdfLanguage, string> = {
    FR: "fr-CH",
    EN: "en-GB",
};

export const formatLongDate = (value: Date, language: PdfLanguage = "FR"): string => {
    return new Date(value).toLocaleDateString(LOCALES[language], {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

// Every fixed string printed on a PDF. The QR-bill's own headings follow the
// wording the Swiss Implementation Guidelines give for each language.
export const PDF_LABELS = {
    FR: {
        placeDate: (city: string, date: string) => `${city}, le ${date}`,
        vatNumber: "N° TVA",
        invoiceNumber: "Facture N°",
        invoice: "Facture",
        quoteNumber: "Offre N°",
        quote: "Offre",
        reminderTitle: "Rappel - Facture N°",
        clientReference: "Référence client",
        location: "Lieu/Bâtiment",
        recap: "Récapitulatif",
        subtotal: "Sous-total",
        discount: "Rabais",
        totalExclVat: "Total HT",
        vat: "TVA",
        totalInclVat: "Total TTC",
        total: "Total",
        dueDate: "Échéance",
        validUntil: (date: string) => `Offre valable jusqu'au ${date}`,
        approval: "Bon pour accord",
        date: "Date :",
        signature: "Signature :",
        description: "Description",
        quantity: "Qté",
        price: "Prix",
        defaultClientTitle: "Madame, Monsieur",
        qrReceipt: "Récépissé",
        qrPaymentPart: "Section paiement",
        qrAccount: "Compte / Payable à",
        qrPayableBy: "Payable par",
        qrPayableByBlank: "Payable par (nom/adresse)",
        qrCurrency: "Monnaie",
        qrAmount: "Montant",
        qrAcceptancePoint: "Point de dépôt",
        qrAdditionalInfo: "Informations supplémentaires",
    },
    EN: {
        placeDate: (city: string, date: string) => `${city}, ${date}`,
        vatNumber: "VAT No.",
        invoiceNumber: "Invoice No.",
        invoice: "Invoice",
        quoteNumber: "Quote No.",
        quote: "Quote",
        reminderTitle: "Reminder - Invoice No.",
        clientReference: "Client reference",
        location: "Site/Building",
        recap: "Summary",
        subtotal: "Subtotal",
        discount: "Discount",
        totalExclVat: "Total excl. VAT",
        vat: "VAT",
        totalInclVat: "Total incl. VAT",
        total: "Total",
        dueDate: "Due date",
        validUntil: (date: string) => `Quote valid until ${date}`,
        approval: "Agreed and accepted",
        date: "Date:",
        signature: "Signature:",
        description: "Description",
        quantity: "Qty",
        price: "Price",
        defaultClientTitle: "Dear Sir or Madam",
        qrReceipt: "Receipt",
        qrPaymentPart: "Payment part",
        qrAccount: "Account / Payable to",
        qrPayableBy: "Payable by",
        qrPayableByBlank: "Payable by (name/address)",
        qrCurrency: "Currency",
        qrAmount: "Amount",
        qrAcceptancePoint: "Acceptance point",
        qrAdditionalInfo: "Additional information",
    },
} satisfies Record<PdfLanguage, Record<string, unknown>>;

export type PdfLabels = typeof PDF_LABELS.FR;
