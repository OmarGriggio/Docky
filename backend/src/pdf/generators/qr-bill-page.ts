import { PdfWriter, mm } from "../core/pdf-writer";
import { SwissQrBillTemplate } from "../templates/swiss-qr-bill.template";
import { createSwissQrBillDto } from "../templates/dto/swiss-qr-bill.dto";
import { generateSwissQrBillImage } from "../swiss-qr-bill/swiss-qr-bill.generator";
import { SwissQrBillDto } from "../swiss-qr-bill/swiss-qr-bill.types";
import { PdfSource } from "./document-pdf-generator";

// The Swiss QR-bill always needs the bottom 105mm of whatever page it ends
// up on entirely to itself (it's drawn by absolute position, not the
// flowing cursor - see swiss-qr-bill.template.ts) - a small buffer on top
// of that so the last line above it doesn't visually touch its top
// separator.
const QR_BILL_MIN_REMAINING_HEIGHT = mm(105) + 20;

export interface PreparedQrBill {
    dto: SwissQrBillDto;
    imageBytes: Buffer;
}

// Shared by the invoice and the payment reminder - both end with the same
// payment slip.
export const prepareQrBill = async ({ document, client, company }: PdfSource): Promise<PreparedQrBill> => {
    const dto = createSwissQrBillDto(document, client, company);
    return { dto, imageBytes: await generateSwissQrBillImage(dto) };
};

// `shareCurrentPage`: draw it onto the page being written if there's still
// room below the flowing text (the invoice's details table may leave some),
// otherwise - or when false, as on a reminder, where it always has a page
// of its own - on a fresh one.
export const renderQrBillPage = async (
    pdf: PdfWriter,
    qrBill: PreparedQrBill,
    { shareCurrentPage }: { shareCurrentPage: boolean }
): Promise<void> => {
    if (!shareCurrentPage || pdf.remainingHeight() < QR_BILL_MIN_REMAINING_HEIGHT) {
        pdf.newPage();
    }
    await SwissQrBillTemplate.render(pdf, qrBill.dto, qrBill.imageBytes);

    // Whichever page the QR-bill ended up on (fresh or shared with the
    // details' own tail) - its strict official layout has no room for a
    // page number too.
    pdf.excludeCurrentPageFromNumbering();
};
