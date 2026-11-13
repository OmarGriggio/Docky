import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { clientDisplayName } from "../../../modules/clients/client.display";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { QrBillCreditor, QrBillDebtor, SwissQrBillDto } from "../../swiss-qr-bill/swiss-qr-bill.types";
import { PDF_LABELS, toPdfLanguage } from "../pdf-labels";
import { hasTypedRecipient } from "./shared";
import { billedAddressOf } from "../../../modules/documents/billed-address";

// The company itself is always the creditor - shared by the invoice's own
// QR-bill below and the standalone slip (pdf/qr-bill-slip.ts).
export const buildQrBillCreditor = (company: Company): QrBillCreditor => ({
    name: (company.name ?? "").trim(),
    street: (company.street ?? "").trim(),
    buildingNumber: "",
    postalCode: (company.postal_code ?? "").trim(),
    town: (company.city ?? "").trim(),
    country: toIsoCountryCode(company.country),
    // Typed with spaces in Profil ("CH93 0076 ...") is still the same IBAN.
    iban: (company.iban ?? "").replace(/\s+/g, "").toUpperCase(),
});

// `amount`: what's left to pay - a final invoice's total less its deposits.
export const createSwissQrBillDto = (
    document: DocumentComplete,
    client: ClientWithAddresses,
    company: Company,
    amount: number = document.amount_incl_vat,
): SwissQrBillDto => {
    // Same name and address the invoice itself is printed to - frozen once
    // it was sent (see billed-address.ts).
    const billed = billedAddressOf(document, client);
    const labels = PDF_LABELS[toPdfLanguage(client.language)];

    // A recipient typed by hand: always in Switzerland for now. Its
    // complement (a c/o...) stays on the document's own address - the
    // structured address has no field for it.
    const debtor: QrBillDebtor = hasTypedRecipient(client, document)
        ? {
            name: document.recipient_name ?? "",
            street: document.recipient_street ?? "",
            buildingNumber: "",
            postalCode: document.recipient_postal_code ?? "",
            town: document.recipient_city ?? "",
            country: "CH",
        }
        : {
            name: billed?.name ?? clientDisplayName(client),
            street: billed?.street ?? "",
            buildingNumber: "",
            postalCode: billed?.postal_code ?? "",
            town: billed?.city ?? "",
            country: toIsoCountryCode(billed?.country ?? null),
        };

    return {
        creditor: buildQrBillCreditor(company),
        debtor: completeDebtorOrNull(debtor),
        payment: {
            amount,
            currency: "CHF",
            additionalInfo: `${labels.invoice} ${document.number}`,
        },
    };
};

// A payer without a postcode and town (a client with no address yet) can't
// be a structured address: the slip leaves "Payable by" blank for the payer
// to fill in instead.
export const completeDebtorOrNull = (debtor: QrBillDebtor): QrBillDebtor | null => {
    const trimmed: QrBillDebtor = {
        name: debtor.name.trim(),
        street: debtor.street.trim(),
        buildingNumber: debtor.buildingNumber.trim(),
        postalCode: debtor.postalCode.trim(),
        town: debtor.town.trim(),
        country: debtor.country.trim(),
    };
    return trimmed.name && trimmed.postalCode && trimmed.town ? trimmed : null;
};

/**
 * The `country` columns store free-text country names, in whichever language
 * the company works in (company 1's "Suisse", the demo company's "Switzerland"),
 * while the Swiss QR-bill spec requires an ISO 3166-1 alpha-2 code. Already
 * ISO-looking values (2 letters) pass through unchanged.
 */
const COUNTRY_NAME_TO_ISO_CODE: Record<string, string> = {
    "suisse": "CH",
    "switzerland": "CH",
    "schweiz": "CH",
    "svizzera": "CH",
    "liechtenstein": "LI",
    "france": "FR",
    "frankreich": "FR",
    "francia": "FR",
    "allemagne": "DE",
    "germany": "DE",
    "deutschland": "DE",
    "germania": "DE",
    "italie": "IT",
    "italy": "IT",
    "italien": "IT",
    "italia": "IT",
    "autriche": "AT",
    "austria": "AT",
    "österreich": "AT",
};

export function toIsoCountryCode(country: string | null): string {
    const value = (country ?? "").trim();
    if (value.length === 2) {
        return value.toUpperCase();
    }
    return COUNTRY_NAME_TO_ISO_CODE[value.toLowerCase()] ?? value;
}
