import QRCode from "qrcode";
import { buildSwissQrBillPayload } from "./swiss-qr-bill.payload";
import { SwissQrBillDto } from "./swiss-qr-bill.types";
import { validateSwissQrBill } from "./swiss-qr-bill.validator";
import { validateCreditor } from "./validators/creditor.validator";
import { ValidationError } from "./validators/validation-error";
import { AppError } from "../../shared/types/errors";

// What's wrong, in the terms the user can act on: most of the time it's
// the company's own profile (no IBAN yet, or no address) - something they
// fix once in Profil, not on the document.
const errorCodeFor = (dto: SwissQrBillDto): string => {
    const creditorCodes = validateCreditor(dto.creditor).map(error => error.code);
    if (creditorCodes.includes("IBAN_EMPTY")) {
        return "COMPANY_IBAN_MISSING";
    }
    if (creditorCodes.some(code => code.startsWith("IBAN_"))) {
        return "COMPANY_IBAN_INVALID";
    }
    if (creditorCodes.length > 0) {
        return "COMPANY_ADDRESS_INCOMPLETE";
    }
    return "QR_BILL_INVALID";
};

// A 422 (not a 500): the request was fine, the data it points at can't
// make a valid QR-bill - see errorCodeFor for what the frontend is told.
export class SwissQrBillValidationError extends AppError {
    constructor(public readonly errors: ValidationError[], dto: SwissQrBillDto) {
        super(`Swiss QR-bill data is invalid: ${errors.map(e => e.message).join(" - ")}`, 422, errorCodeFor(dto));
    }
}

/** Validates the bill data, then encodes its SPC payload as a QR code PNG. */
export async function generateSwissQrBillImage(dto: SwissQrBillDto): Promise<Buffer> {
    const errors = validateSwissQrBill(dto);
    if (errors.length > 0) {
        throw new SwissQrBillValidationError(errors, dto);
    }

    const payload = buildSwissQrBillPayload(dto);

    return QRCode.toBuffer(payload, { errorCorrectionLevel: "Q" });
}
