import QRCode from "qrcode";
import { buildSwissQrBillPayload } from "./swiss-qr-bill.payload";
import { SwissQrBillDto } from "./swiss-qr-bill.types";
import { validateSwissQrBill } from "./swiss-qr-bill.validator";
import { ValidationError } from "./validators/validation-error";

export class SwissQrBillValidationError extends Error {
    constructor(public readonly errors: ValidationError[]) {
        super(`Swiss QR-bill data is invalid: ${errors.map(e => e.code).join(", ")}`);
    }
}

/** Validates the bill data, then encodes its SPC payload as a QR code PNG. */
export async function generateSwissQrBillImage(dto: SwissQrBillDto): Promise<Buffer> {
    const errors = validateSwissQrBill(dto);
    if (errors.length > 0) {
        throw new SwissQrBillValidationError(errors);
    }

    const payload = buildSwissQrBillPayload(dto);

    return QRCode.toBuffer(payload, { errorCorrectionLevel: "Q" });
}
