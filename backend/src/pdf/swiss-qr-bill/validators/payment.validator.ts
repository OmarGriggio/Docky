import { QrBillPayment } from "../swiss-qr-bill.types";
import { isQrIban, isValidCreditorReference, isValidQrReference } from "../payment-reference";
import { ValidationError } from "./validation-error";

const SUPPORTED_CURRENCIES = ["CHF", "EUR"];

// `iban`: the creditor's account the QR-bill is paid to - a QR-IBAN takes a
// QR reference and nothing else, an ordinary IBAN anything but one.
export function validatePayment(payment: QrBillPayment, iban: string): ValidationError[] {
    return [
        ...checkCurrency(payment.currency),
        ...checkAmount(payment.amount),
        ...checkReference(payment.reference, iban),
        ...checkAdditionalInfo(payment.additionalInfo),
    ];
}

function checkReference(reference: QrBillPayment["reference"], iban: string): ValidationError[] {
    if (reference.type === "QRR" && !isValidQrReference(reference.value)) {
        return [{ code: "REFERENCE_INVALID", message: "The QR reference is invalid" }];
    }
    if (reference.type === "SCOR" && !isValidCreditorReference(reference.value)) {
        return [{ code: "REFERENCE_INVALID", message: "The creditor reference is invalid" }];
    }
    if (reference.type === "NON" && reference.value !== "") {
        return [{ code: "REFERENCE_INVALID", message: "No reference type, but a reference" }];
    }
    if (isQrIban(iban) !== (reference.type === "QRR")) {
        return [{ code: "REFERENCE_IBAN_MISMATCH", message: "A QR-IBAN takes a QR reference, and only it does" }];
    }
    return [];
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

// The unstructured message: 140 characters at most.
function checkAdditionalInfo(value: string): ValidationError[] {
    if (value.trim().length > 140) {
        return [{ code: "ADDITIONAL_INFO_LENGTH", message: "Additional information exceeds 140 characters" }];
    }
    return [];
}
