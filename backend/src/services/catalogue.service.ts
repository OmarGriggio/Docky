import { getCatalogueFromDB, getCatalogueByTypeFromDB } from "../repositories/catalogue.repository";

export const getAllCatalogueServ = async () => {
  return await getCatalogueFromDB();
};

export const getCatalogueByTypeServ = async (type: string) => {
  return await getCatalogueByTypeFromDB(type);
};
