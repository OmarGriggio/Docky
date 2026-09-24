import { buffer } from "stream/consumers";
import { PdfWriter, mm } from "./core/pdf-writer";
import { InvoiceTemplate } from "./templates/invoice.template";
import { QuoteTemplate } from "./templates/quote.template";
import { getDocumentCompleteServ } from "../modules/documents/document_complete.service";
import { getClientByIdServ } from "../modules/clients/client.service";
import { createInvoiceDto } from "./templates/dto/invoice.dto";
import { createQuoteDto } from "./templates/dto/quote.dto";
import { getCompanyByIdServ } from "../modules/companies/company.service";
import { createSwissQrBillDto } from "./templates/dto/swiss-qr-bill.dto";
import { SwissQrBillTemplate } from "./templates/swiss-qr-bill.template";
import { generateSwissQrBillImage } from "./swiss-qr-bill/swiss-qr-bill.generator";
import { getFileServ } from "../shared/storage/storage.service";
import { getTemplateServ } from "../modules/documents/document_template.service";
import { AppError } from "../shared/types/errors";
import { ReminderTemplate } from "./templates/reminder.template";
import { createReminderDto } from "./templates/dto/reminder.dto";

// Logos (and the invoice header image, same storage) live in MinIO/S3 now
// (see shared/storage/storage.service.ts), not on local disk - this used to
// read from an "uploads/" folder that stopped being written to once
// company.controller.ts moved to S3, so every PDF's logo silently stopped
// rendering (this always fell through to the catch and returned null). No
// file, not just none set, comes back the same way (null) - a PDF should
// still render without one either way.
const readCompanyImageBytes = async (path: string | null): Promise<Buffer | null> => {
    if (!path) return null;

    const file = await getFileServ(path);
    if (!file) return null;

    return await buffer(file.body);
};

// The Swiss QR-bill always needs the bottom 105mm of whatever page it ends
// up on entirely to itself (it's drawn by absolute position, not the
// flowing cursor - see swiss-qr-bill.template.ts) - a small buffer on top
// of that so the details table's own last line doesn't visually touch its
// top separator.
const QR_BILL_MIN_REMAINING_HEIGHT = mm(105) + 20;

export const generateInvoicePdfServ = async (documentId: number, company_id: number): Promise<Uint8Array> => {
    const document = await getDocumentCompleteServ(documentId, company_id);
    const client = await getClientByIdServ(document.client_id, company_id);
    const company = await getCompanyByIdServ(client.company_id);

    const invoice = createInvoiceDto(document, client, company);
    const qrBill = createSwissQrBillDto(document, client, company);
    const qrImageBytes = await generateSwissQrBillImage(qrBill);
    const logoBytes = await readCompanyImageBytes(company.logo);
    const headerImageBytes = await readCompanyImageBytes(company.header_image);

    const pdf = await PdfWriter.create();
    await InvoiceTemplate.renderRecap(pdf, invoice, logoBytes, headerImageBytes);

    pdf.newPage();
    InvoiceTemplate.renderDetails(pdf, invoice);

    // Onto the same page as the details if there's still room below them,
    // otherwise a fresh one just for the QR-bill.
    if (pdf.remainingHeight() < QR_BILL_MIN_REMAINING_HEIGHT) {
        pdf.newPage();
    }
    await SwissQrBillTemplate.render(pdf, qrBill, qrImageBytes);
    // Whichever page the QR-bill ended up on (fresh or shared with the
    // details' own tail) - its strict official layout has no room for a
    // page number too.
    pdf.excludeCurrentPageFromNumbering();

    pdf.drawPageNumbers();
    return pdf.save();
};

// Payment reminder for an invoice: a one-page letter, then the Swiss QR-bill
// alone on page 2 (always a fresh page - unlike the invoice there's no
// details table to share one with). Nothing here is stored: it's rebuilt from
// the invoice each time, so it always shows its current amount/due date.
export const generateReminderPdfServ = async (documentId: number, company_id: number): Promise<Uint8Array> => {
    const document = await getDocumentCompleteServ(documentId, company_id);
    if (document.type !== "INVOICE") {
        throw new AppError("A reminder can only be generated for an invoice", 400);
    }

    const client = await getClientByIdServ(document.client_id, company_id);
    const company = await getCompanyByIdServ(client.company_id);

    // Falls back to the default text when the company has none.
    const template = await getTemplateServ("REMINDER", company_id);
    const reminder = createReminderDto(document, client, company, template.introduction ?? "");
    const qrBill = createSwissQrBillDto(document, client, company);
    const qrImageBytes = await generateSwissQrBillImage(qrBill);
    const logoBytes = await readCompanyImageBytes(company.logo);

    const pdf = await PdfWriter.create();
    await ReminderTemplate.render(pdf, reminder, logoBytes);

    pdf.newPage();
    await SwissQrBillTemplate.render(pdf, qrBill, qrImageBytes);
    // Same as the invoice: the QR-bill's own page carries no page number.
    pdf.excludeCurrentPageFromNumbering();

    pdf.drawPageNumbers();
    return pdf.save();
};

// Same page 1 recap/page 2 detail split as the invoice (see
// generateInvoicePdfServ above) - no Swiss QR-bill page here though, there's
// nothing to pay yet on a quote, that only makes sense once it's become an
// invoice.
export const generateQuotePdfServ = async (documentId: number, company_id: number): Promise<Uint8Array> => {
    const document = await getDocumentCompleteServ(documentId, company_id);
    const client = await getClientByIdServ(document.client_id, company_id);
    const company = await getCompanyByIdServ(client.company_id);

    const quote = createQuoteDto(document, client, company);
    const logoBytes = await readCompanyImageBytes(company.logo);

    const pdf = await PdfWriter.create();
    await QuoteTemplate.renderRecap(pdf, quote, logoBytes);

    pdf.newPage();
    QuoteTemplate.renderDetails(pdf, quote);

    pdf.drawPageNumbers();
    return pdf.save();
};
