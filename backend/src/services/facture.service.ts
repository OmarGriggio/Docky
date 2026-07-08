import { getFacturesFromDB } from "../repositories/facture.repository";

export const getAllFacturesServ = async () => {
  return await getFacturesFromDB();
};