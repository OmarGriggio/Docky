import { getFacturesLignesFromDB } from "../repositories/facture_ligne.repository";

export const getAllFacturesLignesServ = async () => {
  return await getFacturesLignesFromDB();
};