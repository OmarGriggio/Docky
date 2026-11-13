import { QrBillDebtor } from "../swiss-qr-bill.types";
import { validateAddress } from "./address.validator";
import { ValidationError } from "./validation-error";

/**
 * The debtor is optional: when absent, the payment slip prints a blank box
 * for the payer to fill in by hand. When present, it's a full structured
 * address like the creditor's.
 */
export function validateDebtor(debtor: QrBillDebtor | null): ValidationError[] {
    return debtor ? validateAddress("Debtor", debtor) : [];
}
