/**
 * Domain model for a Swiss QR-bill (payment slip), independent of PDF rendering.
 * Addresses use the "combined" format (2 free-text lines) rather than the
 * "structured" one, since neither the entreprise nor the client/adresse tables
 * split street name from building number.
 */

export interface QrBillCreditor {
    name: string;
    addressLine1: string; // street + building number
    addressLine2: string; // postal code + town
    country: string; // ISO 3166-1 alpha-2
    iban: string;
}

export interface QrBillDebtor {
    name: string;
    addressLine1: string;
    addressLine2: string;
    country: string;
}

export interface QrBillPayment {
    amount: number | null;
    currency: "CHF" | "EUR";
    additionalInfo: string;
}

export interface SwissQrBillDto {
    creditor: QrBillCreditor;
    debtor: QrBillDebtor | null;
    payment: QrBillPayment;
}
