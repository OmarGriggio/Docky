import { PdfWriter } from "./core/pdf-writer";
import { FactureTemplate } from "./templates/facture.template";
import { getDocumentCompleteServ } from "../modules/documents/document_complete.service";
import { getClientByIdServ } from "../modules/clients/client.service";
import { createFactureDto } from "./templates/dto/facture.dto";
import { getEntrepriseByIdServ } from "../modules/entreprises/entreprise.service";

export const generateFacturePdfServ = async (documentId: number): Promise<Uint8Array> => {
    const document = await getDocumentCompleteServ(documentId);
    console.log(document);
    const client = await getClientByIdServ(document.id_client);
    const entreprise = await getEntrepriseByIdServ(client.id_entreprise);

    const facture = createFactureDto(document, client, entreprise);
    
    const pdf = await PdfWriter.create();
    FactureTemplate.render(pdf, facture);

    return pdf.save();
};
