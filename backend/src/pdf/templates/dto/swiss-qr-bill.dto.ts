import { ClientWithAddresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Company } from "../../../modules/companies/company.types";
import { SwissQrBillDto } from "../../swiss-qr-bill/swiss-qr-bill.types";

export const createSwissQrBillDto = (
    document: DocumentComplete,
    client: ClientWithAddresses,
    company: Company,
): SwissQrBillDto => {
    const address = client.addresses[0];

    return {
        creditor: {
            name: company.name ?? "",
            addressLine1: company.street ?? "",
            addressLine2: `${company.postal_code ?? ""} ${company.city ?? ""}`.trim(),
            country: toIsoCountryCode(company.country),
            iban: company.iban ?? "",
        },
        debtor: {
            name: client.company_name ?? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim(),
            addressLine1: address ? address.street : "",
            addressLine2: address ? `${address.postal_code ?? ""} ${address.city ?? ""}`.trim() : "",
            country: toIsoCountryCode(address?.country ?? null),
        },
        payment: {
            amount: document.amount_incl_vat,
            currency: "CHF",
            additionalInfo: `Facture ${document.number}`,
        },
    };
};

/**
 * The `country` columns store free-text French country names (e.g. "Suisse"),
 * while the Swiss QR-bill spec requires an ISO 3166-1 alpha-2 code. Already
 * ISO-looking values (2 letters) pass through unchanged.
 */
const COUNTRY_NAME_TO_ISO_CODE: Record<string, string> = {
    "suisse": "CH",
    "liechtenstein": "LI",
};

function toIsoCountryCode(country: string | null): string {
    const value = (country ?? "").trim();
    if (value.length === 2) {
        return value.toUpperCase();
    }
    return COUNTRY_NAME_TO_ISO_CODE[value.toLowerCase()] ?? value;
}
