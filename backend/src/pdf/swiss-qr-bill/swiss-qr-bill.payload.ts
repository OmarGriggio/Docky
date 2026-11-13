import { QrBillAddress, SwissQrBillDto } from "./swiss-qr-bill.types";

/**
 * Builds the Swiss Payments Code (SPC) payload encoded by the QR code, per the
 * Swiss QR-bill implementation guidelines (version 2.3). Both parties use the
 * structured address type (S): name, street, building number, postcode, town,
 * country - the combined type (K) isn't accepted any more.
 *
 * Reference numbers (QRR / SCOR) are not supported: only IBAN-only payments
 * (referenceType "NON") are produced.
 */
export function buildSwissQrBillPayload(dto: SwissQrBillDto): string {
    const { creditor, debtor, payment } = dto;

    // One field per line: a line break (or any control character) inside a
    // value - a client name typed with one - would shift every field after
    // it, so it's flattened to a space.
    return [
        "SPC",
        "0200",
        "1",

        creditor.iban,

        ...structuredAddress(creditor),

        // Ultimate creditor block: unused, reserved by the spec.
        "", "", "", "", "", "", "",

        payment.amount != null ? payment.amount.toFixed(2) : "",
        payment.currency,

        // No debtor: the slip prints a blank box for the payer instead.
        ...(debtor ? structuredAddress(debtor) : ["", "", "", "", "", "", ""]),

        "NON",
        "",
        payment.additionalInfo,

        "EPD",
        "", "", "",
    ].map(field => String(field).replace(/[\x00-\x1F\x7F]/g, " ")).join("\n");
}

const structuredAddress = (address: QrBillAddress): string[] => [
    "S",
    address.name,
    address.street,
    address.buildingNumber,
    address.postalCode,
    address.town,
    address.country,
];
