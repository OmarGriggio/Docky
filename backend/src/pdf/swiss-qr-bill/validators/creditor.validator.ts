import { QrBillCreditor } from "../swiss-qr-bill.types";
import { validateAddress } from "./address.validator";
import { ValidationError } from "./validation-error";

export function validateCreditor(creditor: QrBillCreditor): ValidationError[] {
    return [
        ...validateAddress("Creditor", creditor),
        ...checkIban(creditor.iban),
    ];
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
