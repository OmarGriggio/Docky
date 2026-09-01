import { getFournisseursFromDB, getFournisseurByCode, getFournisseurByCodeForEntreprise, createFournisseurInDB, deleteFournisseurInDB } from "./fournisseur.repository";
import { Fournisseur } from "./fournisseur.types";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

export const getAllFournisseursServ = async (id_entreprise: number) => {
  return await getFournisseursFromDB(id_entreprise);
};

export const addFournisseurServ = async (fournisseurData: Omit<Fournisseur, "id" | "id_entreprise">, id_entreprise: number) => {
  const existingFournisseur = await getFournisseurByCode(fournisseurData.code_fournisseur);
  if (existingFournisseur) {
    throw new ConflictError("Fournisseur code already exists");
  }
  return await createFournisseurInDB({ ...fournisseurData, id_entreprise });
};

export const deleteFournisseurServ = async (code_fournisseur: string, id_entreprise: number) => {
  const fournisseur = await getFournisseurByCodeForEntreprise(code_fournisseur, id_entreprise);
  if (fournisseur) {
    return await deleteFournisseurInDB(code_fournisseur, id_entreprise);
  } else {
    throw new NotFoundError("Fournisseur not found");
  }
};