import { OffreMateriel } from "../types/offre_materiel";
import { getOffreMaterielsFromDB, createOffreMaterielInDB } from "../repositories/offre_materiel.repository";

export const getAllOffreMaterielsServ = async () => {
  return await getOffreMaterielsFromDB();
};

export const addOffreMaterielServ = async (offreMaterielData: OffreMateriel) => {
  return await createOffreMaterielInDB(offreMaterielData);
};
