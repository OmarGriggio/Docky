import { PdfWriter } from "../core/pdf-writer";
import { InvoiceTemplate } from "../templates/invoice.template";
import { createInvoiceDto } from "../templates/dto/invoice.dto";
import { InvoiceDto } from "../templates/invoice.types";
import { embedImage } from "../templates/letter";
import { drawLetterFooters, setUpLetterPages } from "../templates/business-letter";
import { DocumentPdfGenerator, PdfSource } from "./document-pdf-generator";
import { DocumentComplete } from "../../modules/documents/document_complete.types";
import { NotFoundError } from "../../shared/types/errors";
import { PreparedQrBill, prepareQrBill, renderQrBillPage } from "./qr-bill-page";

interface PreparedInvoice {
    invoice: InvoiceDto;
    qrBill: PreparedQrBill | null;
    logoBytes: Buffer | null;
    headerImageBytes: Buffer | null;
}

// Page 1 recap, then the itemized details, then the Swiss QR-bill - onto the
// same page as the details if there's room, otherwise a fresh one. The
// header image goes on every page, the footer on every page but the
// QR-bill's (its slip takes the whole bottom of the page - those are the
// pages left out of the numbering).
export class InvoicePdfGenerator extends DocumentPdfGenerator<PreparedInvoice> {

    // Only an invoice: a quote or a chantier's ledger printed as one would
    // also slip past the employee permissions of its own type.
    protected override validate(document: DocumentComplete): void {
        if (document.type !== "INVOICE") {
            throw new NotFoundError("Invoice not found");
        }
    }

    protected async prepare(source: PdfSource): Promise<PreparedInvoice> {
        const { document, client, company } = source;
        return {
            invoice: createInvoiceDto(document, client, company, source.style, source.deductions, source.amountDue),
            qrBill: await prepareQrBill(source),
            logoBytes: await this.readCompanyImage(company, "logo"),
            headerImageBytes: await this.readHeaderImage(company, source.style),
        };
    }

    protected async render(pdf: PdfWriter, { invoice, qrBill, logoBytes, headerImageBytes }: PreparedInvoice): Promise<void> {
        const headerImage = headerImageBytes ? await embedImage(pdf, headerImageBytes) : null;
        setUpLetterPages(pdf, headerImage);

        await InvoiceTemplate.renderRecap(pdf, invoice, logoBytes, headerImage !== null);

        // A deposit is one line, already on page 1 - no details page for it,
        // nor in the modern layout, which has every line on page 1.
        if (invoice.invoiceKind !== "DEPOSIT" && invoice.company.layout === "CLASSIC") {
            pdf.newPage();
            InvoiceTemplate.renderDetails(pdf, invoice);
        }

        await renderQrBillPage(pdf, qrBill, { shareCurrentPage: true });

        drawLetterFooters(pdf, invoice);
    }

}
