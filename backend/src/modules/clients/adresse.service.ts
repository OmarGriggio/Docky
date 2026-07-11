import { Adresse } from "./adresse.types";
import { getAdressesFromDB, createAdresseInDB } from "./adresse.repository";
import { getClientByIdFromDB } from "./client.repository";

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
