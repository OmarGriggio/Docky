import {
  getRessourceTarifsFournisseursFromDB,
  getRessourceTarifsFournisseursByRessourceIdFromDB
} from "../repositories/ressource_tarif_fournisseur.repository";

export const getAllRessourceTarifsFournisseursServ = async () => {
  return await getRessourceTarifsFournisseursFromDB();
};

export const getRessourceTarifsFournisseursByRessourceIdServ = async (id_ressource: number) => {
  return await getRessourceTarifsFournisseursByRessourceIdFromDB(id_ressource);
};
