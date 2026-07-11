import { getFournisseursFromDB, getFournisseurByCode, createFournisseurInDB, deleteFournisseurInDB } from "../repositories/fournisseur.repository";
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

export const deleteFournisseurServ = async (code_fournisseur: string) => {
  const fournisseur = await getFournisseurByCode(code_fournisseur);
  if (fournisseur) {
    return await deleteFournisseurInDB(code_fournisseur);
  } else {
    throw new Error("Fournisseur not found");
  }
};