import {
  getRessourceTarifsFournisseursFromDB,
  getRessourceTarifsFournisseursByRessourceIdFromDB
} from "./ressource_tarif_fournisseur.repository";

export const getAllRessourceTarifsFournisseursServ = async (id_entreprise: number) => {
  return await getRessourceTarifsFournisseursFromDB(id_entreprise);
};

export const getRessourceTarifsFournisseursByRessourceIdServ = async (id_ressource: number, id_entreprise: number) => {
  return await getRessourceTarifsFournisseursByRessourceIdFromDB(id_ressource, id_entreprise);
};
