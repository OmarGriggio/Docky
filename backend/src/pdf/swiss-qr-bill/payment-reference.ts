// The payment reference a QR-bill carries, so an incoming payment can be
// matched to its invoice (Swiss QR-bill implementation guidelines, 2.3):
// - QRR, the QR reference: 27 digits, the last a recursive modulo 10 check
//   digit - only with a QR-IBAN, which in turn requires it;
// - SCOR, the creditor reference (ISO 11649): "RF", 2 check digits
//   (modulo 97), then up to 21 letters/digits - with an ordinary IBAN;
// - NON, none at all.
// Pure functions, tested; the company's settings and the invoice's frozen
// reference are resolved in templates/dto/swiss-qr-bill.dto.ts.

export type PaymentReferenceType = "QRR" | "SCOR" | "NON";

export interface PaymentReference {
    type: PaymentReferenceType;
    // "" for NON.
    value: string;
}

export const NO_REFERENCE: PaymentReference = { type: "NON", value: "" };

const compact = (value: string) => value.replace(/\s+/g, "").toUpperCase();

// A QR-IBAN: a Swiss or Liechtenstein IBAN whose institution id (its 5th to
// 9th characters) is in 30000-31999.
export const isQrIban = (iban: string | null | undefined): boolean => {
    const value = compact(iban ?? "");
    if (!/^(CH|LI)\d{2}\d{5}[0-9A-Z]{12}$/.test(value)) {
        return false;
    }
    const iid = Number(value.slice(4, 9));
    return iid >= 30000 && iid <= 31999;
};

// An IBAN's own modulo 97 check (ISO 13616) - a typo in it is caught here.
export const isValidIban = (iban: string | null | undefined): boolean => {
    const value = compact(iban ?? "");
    if (!/^[A-Z]{2}\d{2}[0-9A-Z]{1,30}$/.test(value)) {
        return false;
    }
    return mod97(lettersToDigits(value.slice(4) + value.slice(0, 4))) === 1;
};

const RECURSIVE_MOD10 = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];

// The QR reference's check digit for its first 26 digits.
export const qrReferenceCheckDigit = (digits: string): number => {
    let carry = 0;
    for (const digit of digits) {
        carry = RECURSIVE_MOD10[(carry + Number(digit)) % 10];
    }
    return (10 - carry) % 10;
};

// A QR reference from any digits (26 at most): zero-padded on the left,
// then its check digit.
export const buildQrReference = (digits: string): string => {
    if (!/^\d{1,26}$/.test(digits)) {
        throw new Error("A QR reference is built from 1 to 26 digits");
    }
    const body = digits.padStart(26, "0");
    return body + qrReferenceCheckDigit(body);
};

export const isValidQrReference = (value: string): boolean =>
    /^\d{27}$/.test(value) && qrReferenceCheckDigit(value.slice(0, 26)) === Number(value[26]);

// A = 10 ... Z = 35, digits as they are.
const lettersToDigits = (value: string): string =>
    [...value].map(char => (/[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char)).join("");

// The remainder of a long number (as a string) divided by 97, piece by piece.
const mod97 = (digits: string): number => {
    let remainder = 0;
    for (let i = 0; i < digits.length; i += 7) {
        remainder = Number(String(remainder) + digits.slice(i, i + 7)) % 97;
    }
    return remainder;
};

// A creditor reference from its body (1 to 21 letters/digits): "RF" and its
// two check digits in front.
export const buildCreditorReference = (body: string): string => {
    const value = compact(body);
    if (!/^[0-9A-Z]{1,21}$/.test(value)) {
        throw new Error("A creditor reference is built from 1 to 21 letters or digits");
    }
    const check = 98 - mod97(lettersToDigits(value + "RF00"));
    return `RF${String(check).padStart(2, "0")}${value}`;
};

export const isValidCreditorReference = (value: string): boolean =>
    /^RF\d{2}[0-9A-Z]{1,21}$/.test(value) && mod97(lettersToDigits(value.slice(4) + value.slice(0, 4))) === 1;

// What kind a stored reference is - null or empty being none.
export const referenceOf = (value: string | null | undefined): PaymentReference => {
    const reference = compact(value ?? "");
    if (!reference) {
        return NO_REFERENCE;
    }
    return { type: reference.startsWith("RF") ? "SCOR" : "QRR", value: reference };
};

// An invoice's reference, from its number ("FAC-2026-0012"): a QR reference
// from its digits (20260012), a creditor reference from its letters and
// digits (FAC20260012) - both unique within the company, as the number is.
export const referenceForDocumentNumber = (number: string, type: PaymentReferenceType): PaymentReference => {
    if (type === "QRR") {
        return { type, value: buildQrReference(number.replace(/\D/g, "").slice(-26) || "0") };
    }
    if (type === "SCOR") {
        return { type, value: buildCreditorReference(compact(number).replace(/[^0-9A-Z]/g, "").slice(-21)) };
    }
    return NO_REFERENCE;
};

// As printed: a QR reference in blocks of 5 starting with 2 digits
// ("21 00000 00003 13947 14300 09017"), a creditor reference in blocks of 4.
export const formatReference = (reference: PaymentReference): string => {
    if (reference.type === "QRR") {
        return `${reference.value.slice(0, 2)} ${reference.value.slice(2).replace(/(.{5})(?=.)/g, "$1 ")}`;
    }
    return reference.value.replace(/(.{4})(?=.)/g, "$1 ");
};
