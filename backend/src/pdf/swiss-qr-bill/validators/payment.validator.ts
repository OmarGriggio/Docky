import { QrBillPayment } from "../swiss-qr-bill.types";
import { ValidationError } from "./validation-error";

const SUPPORTED_CURRENCIES = ["CHF", "EUR"];

export function validatePayment(payment: QrBillPayment): ValidationError[] {
    return [...checkCurrency(payment.currency), ...checkAmount(payment.amount)];
}

function checkCurrency(value: string): ValidationError[] {
    if (!SUPPORTED_CURRENCIES.includes(value)) {
        return [{ code: "CURRENCY_UNSUPPORTED", message: "La monnaie doit être CHF ou EUR" }];
    }
    return [];
}

function checkAmount(value: number | null): ValidationError[] {
    if (value === null) {
        return [];
    }
    if (value < 0.01 || value > 999_999_999.99) {
        return [{ code: "AMOUNT_RANGE", message: "Le montant doit être compris entre 0.01 et 999999999.99" }];
    }
    return [];
}
