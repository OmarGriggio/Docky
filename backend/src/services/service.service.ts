import { getServicesFromDB } from "../repositories/service.repository";

export const getAllServicesServ = async () => {
  return await getServicesFromDB();
};
