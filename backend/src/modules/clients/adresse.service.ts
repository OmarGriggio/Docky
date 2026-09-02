import { Adresse } from "./adresse.types";
import {
  getAdressesFromDB,
  getAdressesByClientIdFromDB,
  getAdressesByFournisseurIdFromDB,
  getAdresseByIdFromDB,
  unsetPrincipaleForClientInDB,
  unsetPrincipaleForFournisseurInDB,
  createAdresseInDB,
  deleteAdresseInDB
} from "./adresse.repository";
import { getClientByIdFromDB } from "./client.repository";
import { getFournisseurByIdFromDB } from "../fournisseurs/fournisseur.repository";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

export const getAllAdressesServ = async (id_entreprise: number) => {
  return await getAdressesFromDB(id_entreprise);
};

// An adresse belongs to exactly one of client / fournisseur — never both, never
// neither. The first address added for a given client/fournisseur automatically
// becomes "principale" (there has to be one). Marking a later one as principale
// demotes whichever one was principale before it, so there's always at most one.
export const addAdresseServ = async (adresseData: Omit<Adresse, "id" | "id_entreprise">, id_entreprise: number) => {
  const hasClient = adresseData.id_client !== null;
  const hasFournisseur = adresseData.id_fournisseur !== null;

  if (hasClient === hasFournisseur) {
    throw new ConflictError("An address must belong to exactly one client or fournisseur");
  }

  let existing: unknown[];

  if (hasClient) {
    const client = await getClientByIdFromDB(adresseData.id_client!, id_entreprise);
    if (!client) {
      throw new NotFoundError("Client not found");
    }
    existing = await getAdressesByClientIdFromDB(adresseData.id_client!);
  } else {
    const fournisseur = await getFournisseurByIdFromDB(adresseData.id_fournisseur!, id_entreprise);
    if (!fournisseur) {
      throw new NotFoundError("Fournisseur not found");
    }
    existing = await getAdressesByFournisseurIdFromDB(adresseData.id_fournisseur!);
  }

  const isFirstAdresse = existing.length === 0;
  const principale = isFirstAdresse || adresseData.principale;

  if (principale && !isFirstAdresse) {
    if (hasClient) {
      await unsetPrincipaleForClientInDB(adresseData.id_client!, id_entreprise);
    } else {
      await unsetPrincipaleForFournisseurInDB(adresseData.id_fournisseur!, id_entreprise);
    }
  }

  return await createAdresseInDB({ ...adresseData, principale, id_entreprise });
};

// Addresses are a sub-detail of a client/fournisseur, not a business record on
// their own (unlike clients/documents/etc.) — a real DELETE, no archive here.
// Deleting the "principale" address doesn't auto-promote another one; the
// client/fournisseur is simply left with none until someone adds/marks a new one.
export const deleteAdresseServ = async (id: number, id_entreprise: number) => {
  const adresse = await getAdresseByIdFromDB(id, id_entreprise);
  if (!adresse) {
    throw new NotFoundError("Adresse not found");
  }
  return await deleteAdresseInDB(id, id_entreprise);
};
