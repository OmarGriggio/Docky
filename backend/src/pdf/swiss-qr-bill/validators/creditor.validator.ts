import { QrBillCreditor } from "../swiss-qr-bill.types";
import { ValidationError } from "./validation-error";

export function validateCreditor(creditor: QrBillCreditor): ValidationError[] {
    return [
        ...checkName(creditor.name),
        ...checkAddressLine("ADDR1", creditor.addressLine1),
        ...checkAddressLine("ADDR2", creditor.addressLine2, { required: true }),
        ...checkCountry(creditor.country),
        ...checkIban(creditor.iban),
    ];
}

function checkName(value: string): ValidationError[] {
    const data = normalize(value);
    if (data.length === 0) {
        return [{ code: "NAME_EMPTY", message: "Le nom du créancier est vide" }];
    }
    if (data.length > 70) {
        return [{ code: "NAME_LENGTH", message: "Le nom du créancier dépasse 70 caractères" }];
    }
    return [];
}

function checkAddressLine(field: "ADDR1" | "ADDR2", value: string, options: { required?: boolean } = {}): ValidationError[] {
    const data = normalize(value);
    if (data.length === 0) {
        return options.required
            ? [{ code: `${field}_EMPTY`, message: "L'adresse du créancier est incomplète" }]
            : [];
    }
    if (data.length > 70) {
        return [{ code: `${field}_LENGTH`, message: "Une ligne d'adresse du créancier dépasse 70 caractères" }];
    }
    return [];
}

function checkCountry(value: string): ValidationError[] {
    const data = normalize(value);
    if (data.length === 0) {
        return [{ code: "COUNTRY_EMPTY", message: "Le pays du créancier est vide" }];
    }
    if (data.length !== 2) {
        return [{ code: "COUNTRY_FORMAT", message: "Le pays du créancier doit être un code ISO à 2 lettres" }];
    }
    return [];
}

function checkIban(value: string): ValidationError[] {
    if (value.length === 0) {
        return [{ code: "IBAN_EMPTY", message: "L'IBAN du créancier est vide" }];
    }
    if (value.length !== 21) {
        return [{ code: "IBAN_LENGTH", message: "L'IBAN doit contenir 21 caractères" }];
    }
    if (value.slice(0, 2) !== "CH" && value.slice(0, 2) !== "LI") {
        return [{ code: "IBAN_COUNTRY", message: "L'IBAN doit commencer par CH ou LI" }];
    }
    return [];
}

function normalize(value: string): string {
    return String(value ?? "").trim();
}

function isNumeric(value: string): boolean {
    return !isNaN(parseFloat(value)) && isFinite(Number(value));
}
