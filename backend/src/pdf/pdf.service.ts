import { promises as fs } from "fs";
import path from "path";
import { PdfWriter } from "./core/pdf-writer";
import { FactureTemplate } from "./templates/facture.template";
import { getDocumentCompleteServ } from "../modules/documents/document_complete.service";
import { getClientByIdServ } from "../modules/clients/client.service";
import { createFactureDto } from "./templates/dto/facture.dto";
import { getEntrepriseByIdServ } from "../modules/entreprises/entreprise.service";
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

export const generateFacturePdfServ = async (documentId: number): Promise<Uint8Array> => {
    const document = await getDocumentCompleteServ(documentId);
    const client = await getClientByIdServ(document.id_client);
    const entreprise = await getEntrepriseByIdServ(client.id_entreprise);

    const facture = createFactureDto(document, client, entreprise);
    const qrBill = createSwissQrBillDto(document, client, entreprise);
    const qrImageBytes = await generateSwissQrBillImage(qrBill);
    const logoBytes = await readLogoBytes(entreprise.logo);

    const pdf = await PdfWriter.create();
    await FactureTemplate.render(pdf, facture, logoBytes);

    pdf.newPage();
    await SwissQrBillTemplate.render(pdf, qrBill, qrImageBytes);

    return pdf.save();
};
