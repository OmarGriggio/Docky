import { promises as fs } from "fs";
import path from "path";
import { PdfWriter } from "./core/pdf-writer";
import { InvoiceTemplate } from "./templates/invoice.template";
import { getDocumentCompleteServ } from "../modules/documents/document_complete.service";
import { getClientByIdServ } from "../modules/clients/client.service";
import { createInvoiceDto } from "./templates/dto/invoice.dto";
import { getCompanyByIdServ } from "../modules/companies/company.service";
import { createSwissQrBillDto } from "./templates/dto/swiss-qr-bill.dto";
import { SwissQrBillTemplate } from "./templates/swiss-qr-bill.template";
import { generateSwissQrBillImage } from "./swiss-qr-bill/swiss-qr-bill.generator";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

const readLogoBytes = async (logo: string | null): Promise<Buffer | null> => {
    if (!logo) return null;

    try {
        return await fs.readFile(path.join(UPLOADS_ROOT, logo));
    } catch {
        return null;
    }
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
