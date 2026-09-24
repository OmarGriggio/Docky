import { PdfWriter } from "../core/pdf-writer";
import { ReminderTemplate } from "../templates/reminder.template";
import { createReminderDto } from "../templates/dto/reminder.dto";
import { ReminderDto } from "../templates/reminder.types";
import { DocumentComplete } from "../../modules/documents/document_complete.types";
import { getTemplateServ } from "../../modules/documents/document_template.service";
import { AppError } from "../../shared/types/errors";
import { DocumentPdfGenerator, PdfSource } from "./document-pdf-generator";
import { PreparedQrBill, prepareQrBill, renderQrBillPage } from "./qr-bill-page";

interface PreparedReminder {
    reminder: ReminderDto;
    qrBill: PreparedQrBill;
    logoBytes: Buffer | null;
}

// A payment reminder for an invoice: a one-page letter, then the Swiss
// QR-bill alone on page 2 (always a fresh page - unlike the invoice there's
// no details table to share one with). Nothing here is stored: it's rebuilt
// from the invoice each time, so it always shows its current amount/due
// date.
export class ReminderPdfGenerator extends DocumentPdfGenerator<PreparedReminder> {

    protected override validate(document: DocumentComplete): void {
        if (document.type !== "INVOICE") {
            throw new AppError("A reminder can only be generated for an invoice", 400);
        }
    }

    protected async prepare(source: PdfSource): Promise<PreparedReminder> {
        const { document, client, company } = source;

        // Falls back to the default text when the company has none.
        const template = await getTemplateServ("REMINDER", company.id);

        return {
            reminder: createReminderDto(document, client, company, template?.introduction ?? ""),
            qrBill: await prepareQrBill(source),
            logoBytes: await this.readCompanyImage(company.logo),
        };
    }

    protected async render(pdf: PdfWriter, { reminder, qrBill, logoBytes }: PreparedReminder): Promise<void> {
        await ReminderTemplate.render(pdf, reminder, logoBytes);

        await renderQrBillPage(pdf, qrBill, { shareCurrentPage: false });
    }

}
