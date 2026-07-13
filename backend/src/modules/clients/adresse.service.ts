import { Adresse } from "./adresse.types";
import { getAdressesFromDB, createAdresseInDB } from "./adresse.repository";
import { getClientByIdFromDB } from "./client.repository";

export const getAllAdressesServ = async (id_entreprise: number) => {
  return await getAdressesFromDB(id_entreprise);
};

export const addAdresseServ = async (adresseData: Omit<Adresse, "id" | "id_entreprise">, id_entreprise: number) => {
  const client = await getClientByIdFromDB(adresseData.id_client);
  if (!client || client.id_entreprise !== id_entreprise) {
    throw new Error("Client not found");
  }
  return await createAdresseInDB({ ...adresseData, id_entreprise });
};
