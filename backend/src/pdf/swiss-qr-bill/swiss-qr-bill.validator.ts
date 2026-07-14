import { SwissQrBillDto } from "./swiss-qr-bill.types";
import { validateCreditor } from "./validators/creditor.validator";
import { validateDebtor } from "./validators/debtor.validator";
import { ValidationError } from "./validators/validation-error";
import { validatePayment } from "./validators/payment.validator";

export function validateSwissQrBill(dto: SwissQrBillDto): ValidationError[] {
    return [
        ...validateCreditor(dto.creditor),
        ...validateDebtor(dto.debtor),
        ...validatePayment(dto.payment),
    ];
}
