import { PdfWriter } from "../core/pdf-writer";
import { InvoiceTemplate } from "../templates/invoice.template";
import { createInvoiceDto } from "../templates/dto/invoice.dto";
import { InvoiceDto } from "../templates/invoice.types";
import { embedImage } from "../templates/letter";
import { drawLetterFooters, setUpLetterPages } from "../templates/business-letter";
import { DocumentPdfGenerator, PdfSource } from "./document-pdf-generator";
import { PreparedQrBill, prepareQrBill, renderQrBillPage } from "./qr-bill-page";

interface PreparedInvoice {
    invoice: InvoiceDto;
    qrBill: PreparedQrBill;
    logoBytes: Buffer | null;
    headerImageBytes: Buffer | null;
}

// Page 1 recap, then the itemized details, then the Swiss QR-bill - onto the
// same page as the details if there's room, otherwise a fresh one. The
// header image goes on every page, the footer on every page but the
// QR-bill's (its slip takes the whole bottom of the page - those are the
// pages left out of the numbering).
export class InvoicePdfGenerator extends DocumentPdfGenerator<PreparedInvoice> {

    protected async prepare(source: PdfSource): Promise<PreparedInvoice> {
        const { document, client, company } = source;
        return {
            invoice: createInvoiceDto(document, client, company),
            qrBill: await prepareQrBill(source),
            logoBytes: await this.readCompanyImage(company, "logo"),
            headerImageBytes: await this.readCompanyImage(company, "header"),
        };
    }

    protected async render(pdf: PdfWriter, { invoice, qrBill, logoBytes, headerImageBytes }: PreparedInvoice): Promise<void> {
        const headerImage = headerImageBytes ? await embedImage(pdf, headerImageBytes) : null;
        setUpLetterPages(pdf, headerImage);

        await InvoiceTemplate.renderRecap(pdf, invoice, logoBytes, headerImage !== null);

        pdf.newPage();
        InvoiceTemplate.renderDetails(pdf, invoice);

        await renderQrBillPage(pdf, qrBill, { shareCurrentPage: true });

        drawLetterFooters(pdf, invoice);
    }

}
