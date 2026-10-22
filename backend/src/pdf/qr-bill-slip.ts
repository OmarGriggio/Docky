import { PDFDocument, PDFFont, StandardFonts } from "pdf-lib";
import { getCompanyByIdServ } from "../modules/companies/company.service";
import { AppError } from "../shared/types/errors";
import { SwissQrBillDto } from "./swiss-qr-bill/swiss-qr-bill.types";
import { validateSwissQrBill } from "./swiss-qr-bill/swiss-qr-bill.validator";
import { buildQrBillCreditor, toIsoCountryCode } from "./templates/dto/swiss-qr-bill.dto";
import { PDF_LABELS } from "./templates/pdf-labels";
import { renderSwissQrBillSvg } from "./templates/swiss-qr-bill.svg";

// What the standalone slip page sends: who pays, typed or prefilled from a
// client - no document behind it, so no additional information, and the
// amount is optional (left out, the payer fills it in by hand). `country` is
// optional free text, mapped to an ISO code like a client's own address; the
// company's own country otherwise.
export interface QrBillSlipInput {
    name?: string;
    complement?: string;
    street?: string;
    postalCodeCity?: string;
    country?: string;
    amount?: number | null;
    language?: string;
}

// The narrowest column a payer/creditor line is printed in: the receipt's,
// 52 mm at 8pt (the payment part fits 87 mm at 10pt, wider in proportion).
// Measured with Helvetica's own metrics (pdf-lib ships them) - a line
// that doesn't fit would run over the payment part or the QR code.
const RECEIPT_COLUMN_MM = 52;
const RECEIPT_VALUE_PT = 8;
const PT_TO_MM = 25.4 / 72;

let helvetica: Promise<PDFFont> | null = null;
const getHelvetica = () => helvetica ??= PDFDocument.create().then(doc => doc.embedFont(StandardFonts.Helvetica));

const fitsReceiptColumn = async (value: string): Promise<boolean> => {
    let widthPt: number;
    try {
        widthPt = (await getHelvetica()).widthOfTextAtSize(value, RECEIPT_VALUE_PT);
    } catch {
        // A character Helvetica's WinAnsi encoding doesn't cover - estimate
        // from an average glyph width instead.
        widthPt = value.length * RECEIPT_VALUE_PT * 0.6;
    }
    return widthPt * PT_TO_MM <= RECEIPT_COLUMN_MM;
};

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// A blank-payer slip when nothing is filled in at all (the payer writes it by
// hand, the slip prints empty boxes); otherwise the name and the postcode +
// town are required - the QR payload's combined address needs that second
// line. The complement has no field of its own in that payload, so it's put
// in front of the street on address line 1, while still printed on a line of
// its own.
export const generateQrBillSlipSvgServ = async (company_id: number, input: QrBillSlipInput): Promise<string> => {
    const name = clean(input.name);
    const complement = clean(input.complement);
    const street = clean(input.street);
    const postalCodeCity = clean(input.postalCodeCity);
    const hasDebtor = [name, complement, street, postalCodeCity].some(Boolean);
    const amount = input.amount ?? null;

    if (amount !== null && (typeof amount !== "number" || !Number.isFinite(amount))) {
        throw new AppError("The amount must be a number", 400);
    }

    if (hasDebtor && (!name || !postalCodeCity)) {
        throw new AppError("The payer needs at least a name and a postcode/town", 400);
    }

    const company = await getCompanyByIdServ(company_id);

    const dto: SwissQrBillDto = {
        creditor: buildQrBillCreditor(company),
        debtor: hasDebtor
            ? {
                name,
                addressLine1: [complement, street].filter(Boolean).join(", "),
                addressLine2: postalCodeCity,
                country: toIsoCountryCode(clean(input.country) || company.country) || "CH",
            }
            : null,
        // Range (0.01 to 999 999 999.99) checked by validateSwissQrBill below.
        payment: { amount: amount !== null ? Math.round(amount * 100) / 100 : null, currency: "CHF", additionalInfo: "" },
    };

    const errors = validateSwissQrBill(dto);
    if (errors.length > 0) {
        throw new AppError(errors.map(error => error.message).join(" - "), 400);
    }

    const debtorLines = hasDebtor ? [name, complement, street, postalCodeCity] : null;
    const printed = [dto.creditor.name, dto.creditor.addressLine1, dto.creditor.addressLine2, ...(debtorLines ?? [])];
    for (const value of printed) {
        if (!(await fitsReceiptColumn(value))) {
            throw new AppError(`Too long to fit on the slip: "${value}"`, 400);
        }
    }

    const labels = PDF_LABELS[input.language === "EN" ? "EN" : "FR"];
    return renderSwissQrBillSvg(dto, labels, debtorLines);
};
