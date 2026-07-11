import { Entreprise } from "./entreprise.types";
import { createEntrepriseInDB, getEntrepriseByIdFromDB, getEntreprisesFromDB } from "./entreprise.repository";

export const getAllEntreprisesServ = async () => {
  return await getEntreprisesFromDB();
};

export const getEntrepriseByIdServ = async (id: number): Promise<Entreprise> => {
  const entreprise = await getEntrepriseByIdFromDB(id);
  if (!entreprise) {
    throw new Error("Entreprise not found");
  }
  return entreprise;
};

export const addEntrepriseServ = async (entrepriseData: Omit<Entreprise, "id">) => {
  return await createEntrepriseInDB(entrepriseData);
};
