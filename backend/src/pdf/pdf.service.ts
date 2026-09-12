import { buffer } from "stream/consumers";
import { PdfWriter } from "./core/pdf-writer";
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

// Logos live in MinIO/S3 now (see shared/storage/storage.service.ts), not on
// local disk - this used to read from an "uploads/" folder that stopped
// being written to once company.controller.ts moved to S3, so every PDF's
// logo silently stopped rendering (readLogoBytes always fell through to the
// catch and returned null). No file, not just no logo set, comes back the
// same way (null) - a PDF should still render without one either way.
const readLogoBytes = async (logo: string | null): Promise<Buffer | null> => {
    if (!logo) return null;

    const file = await getFileServ(logo);
    if (!file) return null;

    return await buffer(file.body);
};

export const generateInvoicePdfServ = async (documentId: number, company_id: number): Promise<Uint8Array> => {
    const document = await getDocumentCompleteServ(documentId, company_id);
    const client = await getClientByIdServ(document.client_id, company_id);
    const company = await getCompanyByIdServ(client.company_id);

    const invoice = createInvoiceDto(document, client, company);
    const qrBill = createSwissQrBillDto(document, client, company);
    const qrImageBytes = await generateSwissQrBillImage(qrBill);
    const logoBytes = await readLogoBytes(company.logo);

    const pdf = await PdfWriter.create();
    await InvoiceTemplate.render(pdf, invoice, logoBytes);

    pdf.newPage();
    await SwissQrBillTemplate.render(pdf, qrBill, qrImageBytes);

    return pdf.save();
};

// No Swiss QR-bill page here - there's nothing to pay yet on a quote, that
// only makes sense once it's become an invoice.
export const generateQuotePdfServ = async (documentId: number, company_id: number): Promise<Uint8Array> => {
    const document = await getDocumentCompleteServ(documentId, company_id);
    const client = await getClientByIdServ(document.client_id, company_id);
    const company = await getCompanyByIdServ(client.company_id);

    const quote = createQuoteDto(document, client, company);
    const logoBytes = await readLogoBytes(company.logo);

    const pdf = await PdfWriter.create();
    await QuoteTemplate.render(pdf, quote, logoBytes);

    return pdf.save();
};
