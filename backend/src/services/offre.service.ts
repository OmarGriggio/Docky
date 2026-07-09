import { Offre } from "../types/offre";
import { getOffresFromDB, getOffreByNumFromDB, createOffreInDB } from "../repositories/offre.repository";

export const getAllOffresServ = async () => {
  return await getOffresFromDB();
};

export const addOffreServ = async (offreData: Offre) => {
  const existingOffre = await getOffreByNumFromDB(offreData.num_offre);
  if (existingOffre) {
    throw new Error("Offre number already exists");
  }
  return await createOffreInDB(offreData);
};
