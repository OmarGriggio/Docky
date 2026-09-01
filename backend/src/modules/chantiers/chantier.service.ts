import { ChantierWithType, CreateChantierData } from "./chantier.types";
import { getChantiersFromDB, getChantierByIdFromDB, createChantierInDB, deleteChantierInDB } from "./chantier.repository";

export const getAllChantiersServ = async (id_entreprise: number): Promise<ChantierWithType[]> => {
  return await getChantiersFromDB(id_entreprise);
};

export const addChantierServ = async (chantierData: CreateChantierData, id_entreprise: number) => {
  return await createChantierInDB({ ...chantierData, id_entreprise });
};

export const deleteChantierServ = async (id: number, id_entreprise: number) => {
  const chantier = await getChantierByIdFromDB(id, id_entreprise);
  if (!chantier) {
    throw new Error("Chantier not found");
  }
  return await deleteChantierInDB(id, id_entreprise);
};
