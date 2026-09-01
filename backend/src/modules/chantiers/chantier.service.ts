import { ChantierWithType, CreateChantierData } from "./chantier.types";
import { getChantiersFromDB, getChantierByIdFromDB, createChantierInDB, archiveChantierInDB, unarchiveChantierInDB } from "./chantier.repository";
import { NotFoundError } from "../../shared/types/errors";

export const getAllChantiersServ = async (id_entreprise: number, includeArchived = false): Promise<ChantierWithType[]> => {
  return await getChantiersFromDB(id_entreprise, includeArchived);
};

export const addChantierServ = async (chantierData: CreateChantierData, id_entreprise: number) => {
  return await createChantierInDB({ ...chantierData, id_entreprise });
};

export const archiveChantierServ = async (id: number, id_entreprise: number) => {
  const chantier = await getChantierByIdFromDB(id, id_entreprise);
  if (!chantier) {
    throw new NotFoundError("Chantier not found");
  }
  return await archiveChantierInDB(id, id_entreprise);
};

export const unarchiveChantierServ = async (id: number, id_entreprise: number) => {
  const chantier = await getChantierByIdFromDB(id, id_entreprise);
  if (!chantier) {
    throw new NotFoundError("Chantier not found");
  }
  return await unarchiveChantierInDB(id, id_entreprise);
};
