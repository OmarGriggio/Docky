import { getRessourcesFromDB, getRessourcesByTypeFromDB, getRessourceByIdFromDB, archiveRessourceInDB, unarchiveRessourceInDB } from "./ressource.repository";
import { NotFoundError } from "../../shared/types/errors";

export const getAllRessourcesServ = async (id_entreprise: number, includeArchived = false) => {
  return await getRessourcesFromDB(id_entreprise, includeArchived);
};

export const getRessourcesByTypeServ = async (type: string, id_entreprise: number, includeArchived = false) => {
  return await getRessourcesByTypeFromDB(type, id_entreprise, includeArchived);
};

export const archiveRessourceServ = async (id: number, id_entreprise: number) => {
  const ressource = await getRessourceByIdFromDB(id, id_entreprise);
  if (!ressource) {
    throw new NotFoundError("Ressource not found");
  }
  return await archiveRessourceInDB(id, id_entreprise);
};

export const unarchiveRessourceServ = async (id: number, id_entreprise: number) => {
  const ressource = await getRessourceByIdFromDB(id, id_entreprise);
  if (!ressource) {
    throw new NotFoundError("Ressource not found");
  }
  return await unarchiveRessourceInDB(id, id_entreprise);
};
