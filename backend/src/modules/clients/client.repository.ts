import { db } from "../../shared/config/database";
import {Client, ClientLanguage, ClientListItem, UpdateClientData} from "./client.types"

// Without an explicit ORDER BY, Postgres doesn't guarantee row order at
// all - two calls back-to-back (e.g. list, then reload right after a save)
// can come back in a different order, which reads as the table shuffling
// itself on screen for no reason.
// Each client comes with one address for the list's own columns: its primary
// one, or else its oldest - a LATERAL join picks that single row per client.
export const getClientsFromDB = async (company_id: number, includeArchived = false): Promise<ClientListItem[]> => {
  const result = await db().query(
    `SELECT c.*, a.id AS address_id, a.attention AS address_attention, a.street AS address_street,
            a.postal_code AS address_postal_code, a.city AS address_city, a.country AS address_country
     FROM clients c
     LEFT JOIN LATERAL (
       SELECT id, attention, street, postal_code, city, country FROM addresses
       WHERE client_id = c.id AND company_id = c.company_id
       ORDER BY is_primary DESC, id
       LIMIT 1
     ) a ON true
     WHERE c.company_id = $1${includeArchived ? "" : " AND c.is_active = true"}
     ORDER BY c.id`,
    [company_id]
  );
  return result.rows;
};

export const getClientByIdFromDB = async (id: number, company_id: number) => {
  const result = await db().query("SELECT * FROM clients where id = $1 AND company_id = $2", [id, company_id]);
  return result.rows[0] ?? null;
};

// Scoped to the company: an email only has to be unique within a company,
// and looking across companies would tell one company about another's clients.
export const getClientByEmail = async (email: string, company_id: number) => {
  const result = await db().query("SELECT * FROM clients where email = $1 AND company_id = $2", [email, company_id]);
  return result.rows[0] ?? null;
};


// Same values as zz_migrations/007_add_placeholder_client.sql's backfill -
// called when a company is created (see company.service.ts).
export const createPlaceholderClientInDB = async (company_id: number): Promise<Client> => {
    const result = await db().query(
        `INSERT INTO clients (company_id, client_number, type, company_name, title, language, is_placeholder, is_active)
         VALUES ($1, 'NON-DEFINI', 'PROFESSIONAL', 'Non défini', 'Madame, Monsieur', 'FR', TRUE, TRUE)
         RETURNING *`,
        [company_id]
    );
    return result.rows[0];
};

export const createClientInDB = async (
    client: Omit<Client, "id" | "language" | "is_placeholder">
): Promise<Client> => {
    const query = `
    INSERT INTO clients (
      company_id,
      client_number,
      type,
      company_name,
      last_name,
      first_name,
      title,
      email,
      phone,
      note
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

    const values = [
      client.company_id,
      client.client_number,
      client.type,
      client.company_name,
      client.last_name,
      client.first_name,
      client.title,
      client.email,
      client.phone,
      client.note
    ];

    const result = await db().query(query, values);
    return result.rows[0];
};

export const updateClientInDB = async (
    id: number,
    company_id: number,
    data: UpdateClientData
): Promise<Client> => {
    const query = `
    UPDATE clients SET
      type = $1,
      company_name = $2,
      last_name = $3,
      first_name = $4,
      title = $5,
      email = $6,
      phone = $7,
      note = $8,
      language = $9
      WHERE id = $10 AND company_id = $11
    RETURNING *;
  `;

    const values = [
      data.type,
      data.company_name,
      data.last_name,
      data.first_name,
      data.title,
      data.email,
      data.phone,
      data.note,
      data.language,
      id,
      company_id
    ];

    const result = await db().query(query, values);
    return result.rows[0];
};

export const archiveClientInDB = async (
    id: number,
    company_id: number
): Promise<Client> => {
    const query = `
    UPDATE clients SET is_active = false
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

    const result = await db().query(query, [id, company_id]);
    return result.rows[0];
};

export const unarchiveClientInDB = async (
    id: number,
    company_id: number
): Promise<Client> => {
    const query = `
    UPDATE clients SET is_active = true
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

    const result = await db().query(query, [id, company_id]);
    return result.rows[0];
};

// Client numbers are generated (see client.service.ts's addClientServ): one
// company's are handed out one at a time, the lock held until the
// transaction creating the client commits - two clients created at once
// can't get the same number.
export const lockClientNumberingInDB = async (company_id: number): Promise<void> => {
    await db().query("SELECT pg_advisory_xact_lock($1, hashtext('client-number'))", [company_id]);
};

// The highest number among the company's "C####" client numbers, archived
// ones included - null when there's none yet.
export const getLastClientSequenceFromDB = async (company_id: number, pattern: string): Promise<number | null> => {
    const result = await db().query(
        "SELECT MAX(substring(client_number from $2)::int) AS last FROM clients WHERE company_id = $1 AND client_number ~ $2",
        [company_id, pattern]
    );
    return result.rows[0]?.last ?? null;
};

// One import at a time per company (see client.service.ts's
// importClientsServ): false when another is running - refused rather than
// left waiting with a connection held.
export const tryLockClientImportInDB = async (company_id: number): Promise<boolean> => {
    const result = await db().query("SELECT pg_try_advisory_xact_lock($1, hashtext('client-import')) AS locked", [company_id]);
    return result.rows[0].locked === true;
};

// An import's clients in one statement - not one INSERT per row, a 1000-row
// import would otherwise hold its connection for 1000 round trips. Each
// already numbered; their ids come back keyed by that number.
export const createClientsInDB = async (
    company_id: number,
    clients: { client_number: string; type: string; company_name: string | null; last_name: string | null; first_name: string | null;
        title: string | null; email: string | null; phone: string | null; note: string | null; language: ClientLanguage }[]
): Promise<Map<string, number>> => {
    const column = (key: keyof (typeof clients)[number]) => clients.map(client => client[key]);
    const result = await db().query(
        `INSERT INTO clients (company_id, client_number, type, company_name, last_name, first_name, title, email, phone, note, language)
         SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::text[], $11::text[])
         RETURNING id, client_number`,
        [company_id, column("client_number"), column("type"), column("company_name"), column("last_name"), column("first_name"),
            column("title"), column("email"), column("phone"), column("note"), column("language")]
    );
    return new Map(result.rows.map(row => [row.client_number, row.id]));
};
