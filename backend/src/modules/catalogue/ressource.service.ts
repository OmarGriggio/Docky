import { getRessourcesFromDB, getRessourcesByTypeFromDB } from "./ressource.repository";

export const getAllRessourcesServ = async () => {
  return await getRessourcesFromDB();
};

export const getRessourcesByTypeServ = async (type: string) => {
  return await getRessourcesByTypeFromDB(type);
};
