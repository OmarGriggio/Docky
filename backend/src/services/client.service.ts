import { getClientsFromDB } from "../repositories/client.repository";

export const getAllClients = async () => {
  return await getClientsFromDB();
};