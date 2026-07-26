import { PdfWriter } from "./core/pdf-writer";
import { FactureTemplate } from "./templates/facture.template";
import { getDocumentCompleteServ } from "../modules/documents/document_complete.service";
import { getClientByIdServ } from "../modules/clients/client.service";
import { createFactureDto } from "./templates/dto/facture.dto";
import { getEntrepriseByIdServ } from "../modules/entreprises/entreprise.service";
import { createSwissQrBillDto } from "./templates/dto/swiss-qr-bill.dto";
import { SwissQrBillTemplate } from "./templates/swiss-qr-bill.template";
import { generateSwissQrBillImage } from "./swiss-qr-bill/swiss-qr-bill.generator";

export const generateFacturePdfServ = async (documentId: number): Promise<Uint8Array> => {
    const document = await getDocumentCompleteServ(documentId);
    const client = await getClientByIdServ(document.id_client);
    const entreprise = await getEntrepriseByIdServ(client.id_entreprise);

    const facture = createFactureDto(document, client, entreprise);
    const qrBill = createSwissQrBillDto(document, client, entreprise);
    const qrImageBytes = await generateSwissQrBillImage(qrBill);

    const pdf = await PdfWriter.create();
    FactureTemplate.render(pdf, facture);

    pdf.newPage();
    await SwissQrBillTemplate.render(pdf, qrBill, qrImageBytes);

    return pdf.save();
};
