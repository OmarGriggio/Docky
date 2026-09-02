import {Client, ClientWithAddresses} from "./client.types"
import { createClientInDB, archiveClientInDB, unarchiveClientInDB, getClientByIdFromDB, getClientByEmail, getClientByNumber, getClientsFromDB } from "./client.repository";
import { getAddressesByClientIdFromDB } from "./address.repository";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

export const getAllClientsServ = async (company_id: number, includeArchived = false) => {
  return await getClientsFromDB(company_id, includeArchived);
};

export const getClientByIdServ = async (id: number, company_id: number): Promise<ClientWithAddresses> => {
  const client = await getClientByIdFromDB(id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }

  const addresses = await getAddressesByClientIdFromDB(id);
  return { ...client, addresses };
};

export const addClientServ = async (clientData: Omit<Client, "id" | "company_id">, company_id: number) => {
  const existingClient = await getClientByNumber(clientData.client_number);
  if (!existingClient) {
    if (clientData.email) {
      const clientMail = await getClientByEmail(clientData.email)
      if (!clientMail) {
        return await createClientInDB({ ...clientData, company_id });
      } else {
        throw new ConflictError("Client email already exists");
      }
    }
    return await createClientInDB({ ...clientData, company_id });
  } else {
    throw new ConflictError("Client number already exists");
  }
}

export const archiveClientServ = async (id: number, company_id: number) => {
  const client = await getClientByIdFromDB(id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }
  return await archiveClientInDB(id, company_id);
}

export const unarchiveClientServ = async (id: number, company_id: number) => {
  const client = await getClientByIdFromDB(id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }
  return await unarchiveClientInDB(id, company_id);
}
