import { Adresse } from "../types/adresse";
import { getAdressesFromDB, createAdresseInDB } from "../repositories/adresse.repository";
import { getClientByIdFromDB } from "../repositories/client.repository";

export const getAllAdressesServ = async () => {
  return await getAdressesFromDB();
};

export const addAdresseServ = async (adresseData: Omit<Adresse, "id">) => {
  const client = await getClientByIdFromDB(adresseData.id_client);
  if (!client) {
    throw new Error("Client not found");
  }
  return await createAdresseInDB(adresseData);
};
