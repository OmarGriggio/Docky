import { ClientWithAdresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Entreprise } from "../../../modules/entreprises/entreprise.types";
import { SwissQrBillDto } from "../../swiss-qr-bill/swiss-qr-bill.types";

export const createSwissQrBillDto = (
    document: DocumentComplete,
    client: ClientWithAdresses,
    entreprise: Entreprise,
): SwissQrBillDto => {
    const adresse = client.adresses[0];

    return {
        creditor: {
            name: entreprise.nom_entreprise ?? "",
            addressLine1: entreprise.rue ?? "",
            addressLine2: `${entreprise.npa ?? ""} ${entreprise.ville ?? ""}`.trim(),
            country: toIsoCountryCode(entreprise.pays),
            iban: entreprise.iban ?? "",
        },
        debtor: {
            name: client.societe ?? `${client.prenom ?? ""} ${client.nom ?? ""}`.trim(),
            addressLine1: adresse ? adresse.rue : "",
            addressLine2: adresse ? `${adresse.npa ?? ""} ${adresse.ville ?? ""}`.trim() : "",
            country: toIsoCountryCode(adresse?.pays ?? null),
        },
        payment: {
            amount: document.montant_ttc,
            currency: "CHF",
            additionalInfo: `Facture ${document.numero}`,
        },
    };
};

/**
 * The `pays` columns store free-text French country names (e.g. "Suisse"),
 * while the Swiss QR-bill spec requires an ISO 3166-1 alpha-2 code. Already
 * ISO-looking values (2 letters) pass through unchanged.
 */
const COUNTRY_NAME_TO_ISO_CODE: Record<string, string> = {
    "suisse": "CH",
    "liechtenstein": "LI",
};

function toIsoCountryCode(pays: string | null): string {
    const value = (pays ?? "").trim();
    if (value.length === 2) {
        return value.toUpperCase();
    }
    return COUNTRY_NAME_TO_ISO_CODE[value.toLowerCase()] ?? value;
}
