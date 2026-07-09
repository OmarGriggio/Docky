import { OffreService } from "../types/offre_service";
import { getOffreServicesFromDB, createOffreServiceInDB } from "../repositories/offre_service.repository";

export const getAllOffreServicesServ = async () => {
  return await getOffreServicesFromDB();
};

export const addOffreServiceServ = async (offreServiceData: OffreService) => {
  return await createOffreServiceInDB(offreServiceData);
};
