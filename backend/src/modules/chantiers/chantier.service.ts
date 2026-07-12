import { ChantierWithType, CreateChantierData } from "./chantier.types";
import { getChantiersFromDB, getChantierByIdFromDB, createChantierInDB, deleteChantierInDB } from "./chantier.repository";

export const getAllChantiersServ = async (): Promise<ChantierWithType[]> => {
  return await getChantiersFromDB();
};

export const addChantierServ = async (chantierData: CreateChantierData) => {
  return await createChantierInDB(chantierData);
};

export const deleteChantierServ = async (id: number) => {
  const chantier = await getChantierByIdFromDB(id);
  if (!chantier) {
    throw new Error("Chantier not found");
  }
  return await deleteChantierInDB(id);
};
