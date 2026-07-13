import { getRessourcesFromDB, getRessourcesByTypeFromDB } from "./ressource.repository";

export const getAllRessourcesServ = async (id_entreprise: number) => {
  return await getRessourcesFromDB(id_entreprise);
};

export const getRessourcesByTypeServ = async (type: string, id_entreprise: number) => {
  return await getRessourcesByTypeFromDB(type, id_entreprise);
};
