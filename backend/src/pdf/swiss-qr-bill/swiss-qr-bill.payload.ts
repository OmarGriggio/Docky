import { SwissQrBillDto } from "./swiss-qr-bill.types";

/**
 * Builds the Swiss Payments Code (SPC) payload encoded by the QR code, per the
 * Swiss QR-bill implementation guidelines. Uses the "combined" address type
 * (K) for both parties: no separate street/building-number or postal-code/town
 * fields are sent, only free-text address lines.
 *
 * Reference numbers (QRR / SCOR) are not supported: only IBAN-only payments
 * (referenceType "NON") are produced.
 */
export function buildSwissQrBillPayload(dto: SwissQrBillDto): string {
    const { creditor, debtor, payment } = dto;

    return [
        "SPC",
        "0200",
        "1",

        creditor.iban,

        "K",
        creditor.name,
        creditor.addressLine1,
        creditor.addressLine2,
        "",
        "",
        creditor.country,

        // Ultimate creditor block: unused, reserved by the spec.
        "", "", "", "", "", "", "",

        payment.amount != null ? payment.amount.toFixed(2) : "",
        payment.currency,

        debtor ? "K" : "",
        debtor?.name ?? "",
        debtor?.addressLine1 ?? "",
        debtor?.addressLine2 ?? "",
        "",
        "",
        debtor?.country ?? "",

        "NON",
        "",
        payment.additionalInfo,

        "EPD",
        "", "", "",
    ].join("\n");
}
