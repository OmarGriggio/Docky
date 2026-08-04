import { Entreprise } from "./entreprise.types";
import { createEntrepriseInDB, getEntrepriseByIdFromDB, getEntreprisesFromDB, updateEntrepriseInDB, updateEntrepriseLogoInDB } from "./entreprise.repository";

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

export const updateEntrepriseServ = async (id: number, entrepriseData: Omit<Entreprise, "id">): Promise<Entreprise> => {
  const entreprise = await updateEntrepriseInDB(id, entrepriseData);
  if (!entreprise) {
    throw new Error("Entreprise not found");
  }
  return entreprise;
};

export const updateEntrepriseLogoServ = async (id: number, logo: string): Promise<Entreprise> => {
  const entreprise = await updateEntrepriseLogoInDB(id, logo);
  if (!entreprise) {
    throw new Error("Entreprise not found");
  }
  return entreprise;
};
