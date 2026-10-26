import {Client, ClientWithAddresses, UpdateClientData} from "./client.types"
import { createClientInDB, updateClientInDB, archiveClientInDB, unarchiveClientInDB, getClientByIdFromDB, getClientByEmail, getClientByNumber, getClientsFromDB } from "./client.repository";
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

export const addClientServ = async (clientData: Omit<Client, "id" | "company_id" | "language">, company_id: number) => {
  const existingClient = await getClientByNumber(clientData.client_number, company_id);
  if (!existingClient) {
    if (clientData.email) {
      const clientMail = await getClientByEmail(clientData.email, company_id)
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

// The "Non défini" placeholder (see client.types.ts) is fixed: its greeting
// and language are what every typed-in recipient's PDF uses, and archiving
// it would hide every document made out that way.
const assertNotPlaceholder = (client: Client) => {
  if (client.is_placeholder) {
    throw new ConflictError("The \"Non défini\" client can't be changed");
  }
};

export const updateClientServ = async (id: number, company_id: number, data: UpdateClientData) => {
  const client = await getClientByIdFromDB(id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }
  assertNotPlaceholder(client);

  // Same uniqueness rule as addClientServ - only re-checked if the email
  // actually changed, and excluding this client's own current row.
  if (data.email && data.email !== client.email) {
    const existing = await getClientByEmail(data.email, company_id);
    if (existing) {
      throw new ConflictError("Client email already exists");
    }
  }

  return await updateClientInDB(id, company_id, data);
}

export const archiveClientServ = async (id: number, company_id: number) => {
  const client = await getClientByIdFromDB(id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }
  assertNotPlaceholder(client);
  return await archiveClientInDB(id, company_id);
}

export const unarchiveClientServ = async (id: number, company_id: number) => {
  const client = await getClientByIdFromDB(id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }
  assertNotPlaceholder(client);
  return await unarchiveClientInDB(id, company_id);
}
