import {Client, ClientWithAdresses} from "./client.types"
import { createClientInDB, deleteClientInDB, getClientByIdFromDB, getClientByEmail, getClientByNumClient, getClientByNumClientForEntreprise, getClientsFromDB } from "./client.repository";
import { getAdressesByClientIdFromDB } from "./adresse.repository";

export const getAllClientsServ = async (id_entreprise: number) => {
  return await getClientsFromDB(id_entreprise);
};

export const getClientByIdServ = async (id: number, id_entreprise: number): Promise<ClientWithAdresses> => {
  const client = await getClientByIdFromDB(id, id_entreprise);
  if (!client) {
    throw new Error("Client not found");
  }

  const adresses = await getAdressesByClientIdFromDB(id);
  return { ...client, adresses };
};

export const addClientServ = async (clientData: Omit<Client, "id" | "id_entreprise">, id_entreprise: number) => {
  const existingClient = await getClientByNumClient(clientData.num_client);
  if (!existingClient) {
    if (clientData.email) {
      const clientMail = await getClientByEmail(clientData.email)
      if (!clientMail) {
        return await createClientInDB({ ...clientData, id_entreprise });
      } else {
        throw new Error("Client email already exists");
      }
    }
    return await createClientInDB({ ...clientData, id_entreprise });
  } else {
    throw new Error("Client num_client already exists");
  }
}

export const deleteClientServ = async (num_client: string, id_entreprise: number) => {
  const client = await getClientByNumClientForEntreprise(num_client, id_entreprise);
  if (client){
    return await deleteClientInDB(num_client, id_entreprise) ;
  } else {
    throw new Error("Client not found");
  }

}
