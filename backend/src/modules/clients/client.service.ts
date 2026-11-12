import {Client, ClientWithAddresses, NewClientAddress, UpdateClientData} from "./client.types"
import { createClientInDB, updateClientInDB, archiveClientInDB, unarchiveClientInDB, getClientByIdFromDB, getClientByEmail, getClientsFromDB, lockClientNumberingInDB, getLastClientSequenceFromDB } from "./client.repository";
import { nextSequenceCode, sequencePattern } from "../../shared/numbering/sequence-code";
import { createAddressInDB, getAddressesByClientIdFromDB } from "./address.repository";
import { NotFoundError, ConflictError, AppError } from "../../shared/types/errors";
import { withTransaction } from "../../shared/config/database";

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

const ADDRESS_MAX_LENGTHS = { attention: 100, street: 100, postal_code: 20, city: 100, country: 100 } as const;

// Same fields the client detail page's own address form requires - only the
// attention line is optional.
const resolveNewClientAddress = (address: NewClientAddress): NewClientAddress => {
  const resolved = {} as Record<keyof NewClientAddress, string | null>;
  for (const [field, max] of Object.entries(ADDRESS_MAX_LENGTHS) as [keyof NewClientAddress, number][]) {
    const value = typeof address[field] === "string" ? address[field].trim() : "";
    if (!value && field !== "attention") {
      throw new AppError(`address.${field} is required`, 400);
    }
    if (value.length > max) {
      throw new AppError(`address.${field} must be ${max} characters or fewer`, 400);
    }
    resolved[field] = value || null;
  }
  return resolved as NewClientAddress;
};

const CLIENT_NUMBER_PREFIX = "C";

// The client's number is generated - C0001, C0002... per company, whatever
// the request says (see shared/numbering/sequence-code.ts). An address given
// with the client becomes its primary one, created in the same transaction -
// never a client left half-created without it.
export const addClientServ = async (clientData: Omit<Client, "id" | "company_id" | "language" | "client_number">, company_id: number, address?: NewClientAddress | null) => {
  // Email is optional - an empty one is stored as NULL, not ''.
  clientData = { ...clientData, email: clientData.email || null };
  if (clientData.email && await getClientByEmail(clientData.email, company_id)) {
    throw new ConflictError("Client email already exists");
  }
  const newAddress = address ? resolveNewClientAddress(address) : null;

  return await withTransaction(async () => {
    await lockClientNumberingInDB(company_id);
    const pattern = sequencePattern(CLIENT_NUMBER_PREFIX);
    const client_number = nextSequenceCode(CLIENT_NUMBER_PREFIX, await getLastClientSequenceFromDB(company_id, pattern));
    const client = await createClientInDB({ ...clientData, client_number, company_id });
    if (newAddress) {
      await createAddressInDB({ ...newAddress, client_id: client.id, is_primary: true, company_id });
    }
    return client;
  });
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
  data = { ...data, email: data.email || null };

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
