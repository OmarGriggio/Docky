import { ClientWithAdresses } from "../../../modules/clients/client.types";
import { DocumentComplete } from "../../../modules/documents/document_complete.types";
import { Entreprise } from "../../../modules/entreprises/entreprise.types";
import { FactureDto } from "../facture.types";

export const createFactureDto = (document: DocumentComplete, client: ClientWithAdresses, entreprise: Entreprise): FactureDto => {
    const adresse = client.adresses[0];

    const data: FactureDto = {
        numero: document.numero,
        date: document.date,
        entreprise: {
            nom: entreprise.nom_entreprise ?? "",
            rue: entreprise.rue ?? "",
            ville: entreprise.ville ?? "",
            npaVille: `${entreprise.npa ?? ""} ${entreprise.ville ?? ""}`,
        },
        client: {
            nom: client.societe ?? `${client.prenom ?? ""} ${client.nom ?? ""}`.trim(),
            rue: adresse ? `${adresse.rue}` : "",
            ville: adresse.ville ?? "",
            npaVille: `${adresse.npa ?? ""} ${adresse.ville ?? ""}`,
            civilite: client.civilite ?? "",
        },
        lignes: document.lignes.map(ligne => ({
            libelle: ligne.libelle,
            quantite: ligne.quantite,
            unite: ligne.unite,
            prixUnitaire: ligne.prix_unitaire,
        })),
        montantHt: document.montant_ht,
        montantTtc: document.montant_ttc,
        introduction: document.introduction ?? "",
        conclusion: document.conclusion ?? ""
    };
    
    return data;
}