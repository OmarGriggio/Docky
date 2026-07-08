import { getFournisseursFromDB, getFournisseurByCode, createFournisseurInDB } from "../repositories/fournisseur.repository";
import { Fournisseur } from "../types/fournisseur";

export const getAllFournisseursServ = async () => {
  return await getFournisseursFromDB();
};

export const addFournisseurServ = async (fournisseurData: Fournisseur) => {
  const existingFournisseur = await getFournisseurByCode(fournisseurData.code_fournisseur);
  if (existingFournisseur) {
    throw new Error("Fournisseur code already exists");
  }
  return await createFournisseurInDB(fournisseurData);
};