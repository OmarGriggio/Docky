import { getFournisseursFromDB, getFournisseurByCode, getFournisseurByIdFromDB, createFournisseurInDB, archiveFournisseurInDB, unarchiveFournisseurInDB } from "./fournisseur.repository";
import { getAdressesByFournisseurIdFromDB } from "../clients/adresse.repository";
import { Fournisseur, FournisseurWithAdresses } from "./fournisseur.types";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

export const getAllFournisseursServ = async (id_entreprise: number, includeArchived = false) => {
  return await getFournisseursFromDB(id_entreprise, includeArchived);
};

export const getFournisseurByIdServ = async (id: number, id_entreprise: number): Promise<FournisseurWithAdresses> => {
  const fournisseur = await getFournisseurByIdFromDB(id, id_entreprise);
  if (!fournisseur) {
    throw new NotFoundError("Fournisseur not found");
  }

  const adresses = await getAdressesByFournisseurIdFromDB(id);
  return { ...fournisseur, adresses };
};

export const addFournisseurServ = async (fournisseurData: Omit<Fournisseur, "id" | "id_entreprise">, id_entreprise: number) => {
  const existingFournisseur = await getFournisseurByCode(fournisseurData.code_fournisseur);
  if (existingFournisseur) {
    throw new ConflictError("Fournisseur code already exists");
  }
  return await createFournisseurInDB({ ...fournisseurData, id_entreprise });
};

export const archiveFournisseurServ = async (id: number, id_entreprise: number) => {
  const fournisseur = await getFournisseurByIdFromDB(id, id_entreprise);
  if (!fournisseur) {
    throw new NotFoundError("Fournisseur not found");
  }
  return await archiveFournisseurInDB(id, id_entreprise);
};

export const unarchiveFournisseurServ = async (id: number, id_entreprise: number) => {
  const fournisseur = await getFournisseurByIdFromDB(id, id_entreprise);
  if (!fournisseur) {
    throw new NotFoundError("Fournisseur not found");
  }
  return await unarchiveFournisseurInDB(id, id_entreprise);
};