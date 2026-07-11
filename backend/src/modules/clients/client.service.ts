import {Client, ClientWithAdresses} from "../types/client"
import { createClientInDB, deleteClientInDB, getClientByIdFromDB, getClientByEmail, getClientByNumClient, getClientsFromDB } from "../repositories/client.repository";
import { getAdressesByClientIdFromDB } from "../repositories/adresse.repository";

export const getAllClientsServ = async () => {
  return await getClientsFromDB();
};

export const getClientByIdServ = async (id: number): Promise<ClientWithAdresses> => {
  const client = await getClientByIdFromDB(id);
  if (!client) {
    throw new Error("Client not found");
  }

  const adresses = await getAdressesByClientIdFromDB(id);
  return { ...client, adresses };
};

export const addClientServ = async (clientData: Omit<Client, "id">) => {
  const existingClient = await getClientByNumClient(clientData.num_client);
  if (!existingClient) {
    if (clientData.email) {
      const clientMail = await getClientByEmail(clientData.email)
      if (!clientMail) {
        return await createClientInDB(clientData);
      } else {
        throw new Error("Client email already exists");
      }
    }
    return await createClientInDB(clientData);
  } else {
    throw new Error("Client num_client already exists");
  }
}

export const deleteClientServ = async (num_client: string) => {
  const client = await getClientByNumClient(num_client);
  if (client){
    return await deleteClientInDB(num_client) ;
  } else {
    throw new Error("Client not found");
  }

}
