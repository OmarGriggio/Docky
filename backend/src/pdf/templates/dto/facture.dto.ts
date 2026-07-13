import { ClientWithAdresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { FactureDto } from "../facture.types";

export const createFactureDto = (document: DocumentComplete, client: ClientWithAdresses): FactureDto => {
    const adresse = client.adresses[0]

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
    
    return data;
}