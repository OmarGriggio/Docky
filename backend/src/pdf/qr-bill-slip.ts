import { PDFDocument, PDFFont, StandardFonts } from "pdf-lib";
import { splitPostalCodeCity } from "../shared/address/postal-code-city";
import { printedAddressLines } from "./swiss-qr-bill/swiss-qr-bill.types";
import { getCompanyByIdServ } from "../modules/companies/company.service";
import { AppError } from "../shared/types/errors";
import { SwissQrBillDto } from "./swiss-qr-bill/swiss-qr-bill.types";
import { validateSwissQrBill } from "./swiss-qr-bill/swiss-qr-bill.validator";
import { SwissQrBillValidationError } from "./swiss-qr-bill/swiss-qr-bill.generator";
import { buildQrBillCreditor, toIsoCountryCode } from "./templates/dto/swiss-qr-bill.dto";
import { PDF_LABELS } from "./templates/pdf-labels";
import { renderSwissQrBillSvg } from "./templates/swiss-qr-bill.svg";

// What the standalone slip page sends: who pays, typed or prefilled from a
// client - no document behind it; its "attention" (a contact person) goes in
// the additional information, the structured address has no field for it.
// The amount is optional (left out, the payer fills it in by hand). `country` is
// optional free text, mapped to an ISO code like a client's own address; the
// company's own country otherwise.
export interface QrBillSlipInput {
    name?: string;
    attention?: string;
    street?: string;
    postalCodeCity?: string;
    country?: string;
    amount?: number | null;
    language?: string;
}

// The narrowest column a payer/creditor line is printed in: the receipt's,
// 52 mm at 8pt (the payment part fits 82 mm at 10pt, wider in proportion).
// The additional information is only printed in the payment part: 82 mm at
// 10pt. Measured with Helvetica's own metrics (pdf-lib ships them) - a line
// that doesn't fit would run over the payment part or the QR code.
const RECEIPT_COLUMN = { mm: 52, pt: 8 };
const PAYMENT_COLUMN = { mm: 82, pt: 10 };
const PT_TO_MM = 25.4 / 72;

let helvetica: Promise<PDFFont> | null = null;
const getHelvetica = () => helvetica ??= PDFDocument.create().then(doc => doc.embedFont(StandardFonts.Helvetica));

const fitsColumn = async (value: string, column: { mm: number; pt: number }): Promise<boolean> => {
    let widthPt: number;
    try {
        widthPt = (await getHelvetica()).widthOfTextAtSize(value, column.pt);
    } catch {
        // A character Helvetica's WinAnsi encoding doesn't cover - estimate
        // from an average glyph width instead.
        widthPt = value.length * column.pt * 0.6;
    }
    return widthPt * PT_TO_MM <= column.mm;
};

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// A blank-payer slip when nothing is filled in at all (the payer writes it by
// hand, the slip prints empty boxes); otherwise the name, postcode and town
// are required - a structured address needs them. A complement (a c/o...)
// has no field in that address and isn't printed: the guidelines leave it to
// the invoice itself.
export const generateQrBillSlipSvgServ = async (company_id: number, input: QrBillSlipInput): Promise<string> => {
    const name = clean(input.name);
    const attention = clean(input.attention);
    const street = clean(input.street);
    const { postalCode, city } = splitPostalCodeCity(clean(input.postalCodeCity));
    const hasDebtor = [name, street, postalCode, city].some(Boolean);
    const amount = input.amount ?? null;

    if (amount !== null && (typeof amount !== "number" || !Number.isFinite(amount))) {
        throw new AppError("The amount must be a number", 400);
    }

    if (hasDebtor && (!name || !postalCode || !city)) {
        throw new AppError("The payer needs at least a name and a postcode/town", 400);
    }

    const company = await getCompanyByIdServ(company_id);
    const labels = PDF_LABELS[input.language === "EN" ? "EN" : "FR"];

    const dto: SwissQrBillDto = {
        creditor: buildQrBillCreditor(company),
        debtor: hasDebtor
            ? {
                name,
                street,
                buildingNumber: "",
                postalCode,
                town: city,
                country: toIsoCountryCode(clean(input.country) || company.country) || "CH",
            }
            : null,
        // Range (0.01 to 999 999 999.99) checked by validateSwissQrBill below.
        payment: {
            amount: amount !== null ? Math.round(amount * 100) / 100 : null,
            currency: "CHF",
            additionalInfo: attention ? labels.qrAttention(attention) : "",
        },
    };

    const errors = validateSwissQrBill(dto);
    if (errors.length > 0) {
        throw new SwissQrBillValidationError(errors, dto);
    }

    const printed = [dto.creditor, ...(dto.debtor ? [dto.debtor] : [])]
        .flatMap(party => [party.name, ...printedAddressLines(party)]);
    for (const value of printed) {
        if (!(await fitsColumn(value, RECEIPT_COLUMN))) {
            throw new AppError(`Too long to fit on the slip: "${value}"`, 400);
        }
    }
    if (!(await fitsColumn(dto.payment.additionalInfo, PAYMENT_COLUMN))) {
        throw new AppError(`Too long to fit on the slip: "${dto.payment.additionalInfo}"`, 400);
    }

    return renderSwissQrBillSvg(dto, labels);
};
