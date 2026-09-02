import { QrBillDebtor } from "../swiss-qr-bill.types";
import { ValidationError } from "./validation-error";

/**
 * The debtor is optional: when absent, the payment slip prints a blank box
 * for the payer to fill in by hand. When present, its fields are still
 * validated so the printed QR-bill stays spec-compliant.
 */
export function validateDebtor(debtor: QrBillDebtor | null): ValidationError[] {
    if (!debtor) {
        return [];
    }

    return [
        ...checkLength("NAME", debtor.name, 70),
        ...checkLength("ADDR1", debtor.addressLine1, 70),
        ...checkLength("ADDR2", debtor.addressLine2, 70),
        ...checkCountry(debtor.country),
    ];
}

function checkLength(field: string, value: string, max: number): ValidationError[] {
    const data = normalize(value);
    if (data.length > max) {
        return [{ code: `${field}_LENGTH`, message: `A debtor line exceeds ${max} characters` }];
    }
    return [];
}

function checkCountry(value: string): ValidationError[] {
    const data = normalize(value);
    if (data.length > 0 && data.length !== 2) {
        return [{ code: "COUNTRY_FORMAT", message: "Debtor country must be a 2-letter ISO code" }];
    }
    return [];
}

function normalize(value: string): string {
    return String(value ?? "").trim();
}
