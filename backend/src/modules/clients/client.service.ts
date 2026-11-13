import {Client, ClientWithAddresses, NewClientAddress, UpdateClientData} from "./client.types"
import { createClientInDB, updateClientInDB, archiveClientInDB, unarchiveClientInDB, getClientByIdFromDB, getClientByEmail, getClientsFromDB, lockClientNumberingInDB, getLastClientSequenceFromDB } from "./client.repository";
import { nextSequenceCode, sequencePattern } from "../../shared/numbering/sequence-code";
import { createAddressInDB, getAddressesByClientIdFromDB } from "./address.repository";
import { NotFoundError, ConflictError, AppError } from "../../shared/types/errors";
import { withTransaction } from "../../shared/config/database";
import { checkImportRows, ClientImportRow, ImportContext, ImportRowResult, MAX_IMPORT_ROWS, nameKey } from "./client-import";

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

export interface ClientImportRequest {
  rows: ClientImportRow[];
  // An address's country when the file has none, in the user's language.
  defaultCountry?: string;
  language?: "FR" | "EN";
}

export interface ClientImportReport {
  rows: ImportRowResult[];
  // How many clients were created - 0 for a dry run, or when any row has an error.
  created: number;
}

// What the company already has that a row may collide with - archived
// clients included, their numbers are never handed out again.
const importContext = async (company_id: number, request: ClientImportRequest): Promise<ImportContext> => {
  const clients = await getClientsFromDB(company_id, true);
  const country = typeof request.defaultCountry === "string" && request.defaultCountry.trim()
    ? request.defaultCountry.trim().slice(0, 100)
    : "Suisse";
  return {
    existingNumbers: new Set(clients.map(client => client.client_number)),
    existingEmails: new Set(clients.filter(client => client.email).map(client => client.email!.toLowerCase())),
    existingNameKeys: new Set(
      clients
        .filter(client => !client.is_placeholder)
        .map(client => nameKey(client.company_name || `${client.first_name ?? ""} ${client.last_name ?? ""}`, client.address_postal_code))
    ),
    defaultCountry: country,
    language: request.language === "EN" ? "EN" : "FR",
  };
};

// POST /client/import (see client-import.ts): a dry run only judges the rows
// - the preview. A real import judges them again, under the client numbering
// lock so nothing created meanwhile can collide, and creates them all or none:
// a single row with an error and nothing is written. Rows with a number keep
// it; the others get the next ones after the highest number there is then,
// the imported ones included.
export const importClientsServ = async (company_id: number, request: ClientImportRequest, dryRun: boolean): Promise<ClientImportReport> => {
  if (!Array.isArray(request?.rows)) {
    throw new AppError("rows must be a list", 400);
  }
  if (request.rows.length > MAX_IMPORT_ROWS) {
    throw new AppError(`At most ${MAX_IMPORT_ROWS} rows can be imported at once`, 400, "TOO_MANY_ROWS");
  }
  const rows = request.rows.map(row => (row && typeof row === "object" ? row : {}));

  if (dryRun) {
    return { rows: checkImportRows(rows, await importContext(company_id, request)), created: 0 };
  }

  return await withTransaction(async () => {
    await lockClientNumberingInDB(company_id);
    const results = checkImportRows(rows, await importContext(company_id, request));
    if (results.some(result => result.errors.length > 0)) {
      return { rows: results, created: 0 };
    }

    const pattern = sequencePattern(CLIENT_NUMBER_PREFIX);
    const importedSequences = results
      .map(result => Number(result.client.client_number?.match(/^C(\d+)$/)?.[1] ?? 0));
    let last = Math.max(await getLastClientSequenceFromDB(company_id, pattern) ?? 0, ...importedSequences);

    for (const { client: { language, ...client }, address } of results) {
      const client_number = client.client_number ?? nextSequenceCode(CLIENT_NUMBER_PREFIX, last++);
      const created = await createClientInDB({ ...client, client_number, company_id, is_active: true }, language);
      if (address) {
        await createAddressInDB({ ...address, client_id: created.id, is_primary: true, company_id });
      }
    }
    return { rows: results, created: results.length };
  });
};
