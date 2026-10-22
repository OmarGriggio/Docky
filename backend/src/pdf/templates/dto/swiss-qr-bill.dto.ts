import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { clientDisplayName } from "../../../modules/clients/client.display";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { SwissQrBillDto } from "../../swiss-qr-bill/swiss-qr-bill.types";
import { PDF_LABELS, toPdfLanguage } from "../pdf-labels";
import { resolveBillingAddress } from "./shared";

export const createSwissQrBillDto = (
    document: DocumentComplete,
    client: ClientWithAddresses,
    company: Company,
): SwissQrBillDto => {
    // Same address the invoice itself is printed to - see shared.ts.
    const address = resolveBillingAddress(client);
    const labels = PDF_LABELS[toPdfLanguage(client.language)];

    return {
        creditor: {
            name: company.name ?? "",
            addressLine1: company.street ?? "",
            addressLine2: `${company.postal_code ?? ""} ${company.city ?? ""}`.trim(),
            country: toIsoCountryCode(company.country),
            iban: company.iban ?? "",
        },
        debtor: {
            name: clientDisplayName(client),
            addressLine1: address ? address.street : "",
            addressLine2: address ? `${address.postal_code ?? ""} ${address.city ?? ""}`.trim() : "",
            country: toIsoCountryCode(address?.country ?? null),
        },
        payment: {
            amount: document.amount_incl_vat,
            currency: "CHF",
            additionalInfo: `${labels.invoice} ${document.number}`,
        },
    };
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

function toIsoCountryCode(country: string | null): string {
    const value = (country ?? "").trim();
    if (value.length === 2) {
        return value.toUpperCase();
    }
    return COUNTRY_NAME_TO_ISO_CODE[value.toLowerCase()] ?? value;
}
