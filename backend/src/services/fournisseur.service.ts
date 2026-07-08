import { getFournisseursFromDB } from "../repositories/fournisseur.repository";

export const getAllFournisseursServ = async () => {
  return await getFournisseursFromDB();
};  