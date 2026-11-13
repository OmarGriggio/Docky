import { QrBillAddress } from "../swiss-qr-bill.types";
import { ValidationError } from "./validation-error";

// A structured address (type "S"), creditor's or debtor's: name, postcode,
// town and country required, each within the guidelines' own length.
export function validateAddress(party: "Creditor" | "Debtor", address: QrBillAddress): ValidationError[] {
    return [
        ...check(party, "NAME", address.name, 70, true),
        ...check(party, "STREET", address.street, 70, false),
        ...check(party, "BUILDING_NUMBER", address.buildingNumber, 16, false),
        ...check(party, "POSTAL_CODE", address.postalCode, 16, true),
        ...check(party, "TOWN", address.town, 35, true),
        ...checkCountry(party, address.country),
    ];
}

function check(party: string, field: string, value: string, max: number, required: boolean): ValidationError[] {
    const data = normalize(value);
    if (data.length === 0) {
        return required ? [{ code: `${field}_EMPTY`, message: `${party} address is incomplete (${field.toLowerCase()})` }] : [];
    }
    if (data.length > max) {
        return [{ code: `${field}_LENGTH`, message: `${party} ${field.toLowerCase()} exceeds ${max} characters` }];
    }
    return [];
}

function checkCountry(party: string, value: string): ValidationError[] {
    const data = normalize(value);
    if (data.length === 0) {
        return [{ code: "COUNTRY_EMPTY", message: `${party} country is empty` }];
    }
    if (data.length !== 2) {
        return [{ code: "COUNTRY_FORMAT", message: `${party} country must be a 2-letter ISO code` }];
    }
    return [];
}

function normalize(value: string): string {
    return String(value ?? "").trim();
}
