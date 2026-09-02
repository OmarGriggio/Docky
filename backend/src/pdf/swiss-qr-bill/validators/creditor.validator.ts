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
        return [{ code: "NAME_EMPTY", message: "Creditor name is empty" }];
    }
    if (data.length > 70) {
        return [{ code: "NAME_LENGTH", message: "Creditor name exceeds 70 characters" }];
    }
    return [];
}

function checkAddressLine(field: "ADDR1" | "ADDR2", value: string, options: { required?: boolean } = {}): ValidationError[] {
    const data = normalize(value);
    if (data.length === 0) {
        return options.required
            ? [{ code: `${field}_EMPTY`, message: "Creditor address is incomplete" }]
            : [];
    }
    if (data.length > 70) {
        return [{ code: `${field}_LENGTH`, message: "A creditor address line exceeds 70 characters" }];
    }
    return [];
}

function checkCountry(value: string): ValidationError[] {
    const data = normalize(value);
    if (data.length === 0) {
        return [{ code: "COUNTRY_EMPTY", message: "Creditor country is empty" }];
    }
    if (data.length !== 2) {
        return [{ code: "COUNTRY_FORMAT", message: "Creditor country must be a 2-letter ISO code" }];
    }
    return [];
}

function checkIban(value: string): ValidationError[] {
    if (value.length === 0) {
        return [{ code: "IBAN_EMPTY", message: "Creditor IBAN is empty" }];
    }
    if (value.length !== 21) {
        return [{ code: "IBAN_LENGTH", message: "IBAN must contain 21 characters" }];
    }
    if (value.slice(0, 2) !== "CH" && value.slice(0, 2) !== "LI") {
        return [{ code: "IBAN_COUNTRY", message: "IBAN must start with CH or LI" }];
    }
    return [];
}

function normalize(value: string): string {
    return String(value ?? "").trim();
}

function isNumeric(value: string): boolean {
    return !isNaN(parseFloat(value)) && isFinite(Number(value));
}
