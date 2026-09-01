import {Client, ClientWithAdresses} from "./client.types"
import { createClientInDB, archiveClientInDB, unarchiveClientInDB, getClientByIdFromDB, getClientByEmail, getClientByNumClient, getClientsFromDB } from "./client.repository";
import { getAdressesByClientIdFromDB } from "./adresse.repository";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

export const getAllClientsServ = async (id_entreprise: number, includeArchived = false) => {
  return await getClientsFromDB(id_entreprise, includeArchived);
};

export const getClientByIdServ = async (id: number, id_entreprise: number): Promise<ClientWithAdresses> => {
  const client = await getClientByIdFromDB(id, id_entreprise);
  if (!client) {
    throw new NotFoundError("Client not found");
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
        throw new ConflictError("Client email already exists");
      }
    }
    return await createClientInDB({ ...clientData, id_entreprise });
  } else {
    throw new ConflictError("Client num_client already exists");
  }
}

export const archiveClientServ = async (id: number, id_entreprise: number) => {
  const client = await getClientByIdFromDB(id, id_entreprise);
  if (!client) {
    throw new NotFoundError("Client not found");
  }
  return await archiveClientInDB(id, id_entreprise);
}

export const unarchiveClientServ = async (id: number, id_entreprise: number) => {
  const client = await getClientByIdFromDB(id, id_entreprise);
  if (!client) {
    throw new NotFoundError("Client not found");
  }
  return await unarchiveClientInDB(id, id_entreprise);
}
