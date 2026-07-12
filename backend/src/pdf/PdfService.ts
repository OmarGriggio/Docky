import { PdfDocument } from "./PdfDocument";
import { FacturePdf } from "./templates/FacturePdf";
import { FactureDto } from "./PdfTypes";
import { getDocumentCompleteServ } from "../modules/documents/document_complete.service";
import { getClientByIdServ } from "../modules/clients/client.service";

export const generateFacturePdfServ = async (documentId: number): Promise<Uint8Array> => {
    const document = await getDocumentCompleteServ(documentId);
    const client = await getClientByIdServ(document.id_client);
    const adresse = client.adresses[0];

    const data: FactureDto = {
        numero: document.numero,
        date: document.date,
        client: {
            nom: client.societe ?? `${client.prenom ?? ""} ${client.nom ?? ""}`.trim(),
            adresse: adresse ? `${adresse.rue}, ${adresse.npa} ${adresse.ville}` : "",
        },
        lignes: document.lignes.map(ligne => ({
            libelle: ligne.libelle,
            quantite: ligne.quantite,
            unite: ligne.unite,
            prixUnitaire: ligne.prix_unitaire,
        })),
        montantHt: document.montant_ht,
        montantTtc: document.montant_ttc,
    };

    const pdf = await PdfDocument.create();
    FacturePdf.render(pdf, data);

    return pdf.save();
};
