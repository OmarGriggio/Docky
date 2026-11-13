/**
 * Domain model for a Swiss QR-bill (payment slip), independent of PDF rendering.
 * Addresses are structured (type "S" - the only one allowed since the
 * guidelines' version 2.3, 22.11.2025): the street keeps its building number
 * when typed together ("Rue de Lausanne 12"), which the guidelines tolerate,
 * since neither the companies nor the addresses tables split them. A c/o or
 * complement has no field here - "irrelevant for the payer", it stays on the
 * document's own address.
 */

export interface QrBillAddress {
    name: string;
    street: string; // street, with its building number when typed together
    buildingNumber: string;
    postalCode: string;
    town: string;
    country: string; // ISO 3166-1 alpha-2
}

export interface QrBillCreditor extends QrBillAddress {
    iban: string;
}

export type QrBillDebtor = QrBillAddress;

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

// The address as printed on the receipt and the payment part: street and
// building number, then postcode and town - empty lines left out.
export const printedAddressLines = (address: QrBillAddress): string[] => [
    [address.street, address.buildingNumber].map(value => value.trim()).filter(Boolean).join(" "),
    [address.postalCode, address.town].map(value => value.trim()).filter(Boolean).join(" "),
].filter(Boolean);
