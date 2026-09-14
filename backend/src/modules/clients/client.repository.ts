import { pool } from "../../shared/config/database";
import {Client, UpdateClientData} from "./client.types"

// Without an explicit ORDER BY, Postgres doesn't guarantee row order at
// all - two calls back-to-back (e.g. list, then reload right after a save)
// can come back in a different order, which reads as the table shuffling
// itself on screen for no reason.
export const getClientsFromDB = async (company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM clients where company_id = $1 ORDER BY id"
    : "SELECT * FROM clients where company_id = $1 AND is_active = true ORDER BY id";
  const result = await pool.query(query, [company_id]);
  return result.rows;
};

export const getClientByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query("SELECT * FROM clients where id = $1 AND company_id = $2", [id, company_id]);
  return result.rows[0] ?? null;
};

export const getClientByNumber = async (client_number: string) => {
  const result = await pool.query("SELECT * FROM clients where client_number = $1", [client_number]);
  return result.rows[0] ?? null;
};


export const getClientByEmail = async (email: string) => {
  const result = await pool.query("SELECT * FROM clients where email = $1", [email]);
  return result.rows[0] ?? null;
};


export const createClientInDB = async (
    client: Omit<Client, "id">
): Promise<Client> => {
    const query = `
    INSERT INTO clients (
      company_id,
      client_number,
      type,
      company_name,
      vat_number,
      last_name,
      first_name,
      title,
      email,
      phone,
      note
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

    const values = [
      client.company_id,
      client.client_number,
      client.type,
      client.company_name,
      client.vat_number,
      client.last_name,
      client.first_name,
      client.title,
      client.email,
      client.phone,
      client.note
    ];

    const result = await pool.query(query, values);
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
      vat_number = $3,
      last_name = $4,
      first_name = $5,
      title = $6,
      email = $7,
      phone = $8,
      note = $9
      WHERE id = $10 AND company_id = $11
    RETURNING *;
  `;

    const values = [
      data.type,
      data.company_name,
      data.vat_number,
      data.last_name,
      data.first_name,
      data.title,
      data.email,
      data.phone,
      data.note,
      id,
      company_id
    ];

    const result = await pool.query(query, values);
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

    const result = await pool.query(query, [id, company_id]);
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

    const result = await pool.query(query, [id, company_id]);
    return result.rows[0];
};
