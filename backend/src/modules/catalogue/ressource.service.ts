import { getRessourcesFromDB, getRessourcesByTypeFromDB } from "../repositories/ressource.repository";

export const getAllRessourcesServ = async () => {
  return await getRessourcesFromDB();
};

export const getRessourcesByTypeServ = async (type: string) => {
  return await getRessourcesByTypeFromDB(type);
};
