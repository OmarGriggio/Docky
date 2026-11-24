import { PdfWriter } from "../core/pdf-writer";
import { ReminderTemplate } from "../templates/reminder.template";
import { createReminderDto } from "../templates/dto/reminder.dto";
import { ReminderDto, ReminderToPrint } from "../templates/reminder.types";
import { DocumentComplete } from "../../modules/documents/document_complete.types";
import { AppError } from "../../shared/types/errors";
import { DocumentPdfGenerator, PdfSource } from "./document-pdf-generator";
import { PreparedQrBill, prepareQrBill, renderQrBillPage } from "./qr-bill-page";
import { withCurrentAddress } from "../../modules/documents/billed-address";
import { embedImage } from "../templates/letter";
import { drawLetterFooters, setUpLetterPages } from "../templates/business-letter";

interface PreparedReminder {
    reminder: ReminderDto;
    qrBill: PreparedQrBill | null;
    logoBytes: Buffer | null;
    headerImageBytes: Buffer | null;
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// A payment reminder for an invoice - `reminder` says which one (a reminder
// already sent, printed as it went out, or the next one previewed - see
// reminder.service.ts): a one-page letter laid out like the invoice (its
// header image, colors and footer), then the Swiss QR-bill alone on page 2
// (always a fresh page - unlike the invoice there's no details table to
// share one with), asking for the invoice's balance plus the reminders'
// fees.
export class ReminderPdfGenerator extends DocumentPdfGenerator<PreparedReminder> {

    constructor(private readonly reminder: ReminderToPrint) {
        super();
    }

    protected override validate(document: DocumentComplete): void {
        if (document.type !== "INVOICE") {
            throw new AppError("A reminder can only be generated for an invoice", 400);
        }
    }

    // The address it was sent to, or the client's current one for a preview
    // - not the one the invoice was frozen with: a client may have moved since
    // (billed-address.ts's withCurrentAddress).
    protected async prepare(source: PdfSource): Promise<PreparedReminder> {
        const document = this.reminder.billedAddress === undefined
            ? withCurrentAddress(source.document)
            : { ...source.document, billed_address: this.reminder.billedAddress };
        const { client, company } = source;
        // What's left to pay on the invoice (a final invoice's deposits are
        // invoices of their own), then the fees on top for the QR-bill.
        const balance = this.reminder.amountDue ?? source.amountDue;

        return {
            reminder: createReminderDto(document, client, company, source.style, this.reminder, balance),
            qrBill: await prepareQrBill({ ...source, document, amountDue: round2(balance + this.reminder.totalFees) }),
            logoBytes: await this.readCompanyLogo(company),
            headerImageBytes: await this.readHeaderImage(company, source.style),
        };
    }

    protected async render(pdf: PdfWriter, { reminder, qrBill, logoBytes, headerImageBytes }: PreparedReminder): Promise<void> {
        const headerImage = headerImageBytes ? await embedImage(pdf, headerImageBytes) : null;
        setUpLetterPages(pdf, headerImage);

        await ReminderTemplate.render(pdf, reminder, logoBytes, headerImage !== null);

        await renderQrBillPage(pdf, qrBill, { shareCurrentPage: false });

        drawLetterFooters(pdf, reminder.letter);
    }

}
