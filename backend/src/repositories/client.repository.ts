import { pool } from "../config/database";
import {Client} from "../types/client"

export const getClientsFromDB = async () => {
  const result = await pool.query("SELECT * FROM clients");
  return result.rows;
};

export const getClientByCode = async (code: string) => {
  const result = await pool.query("SELECT * FROM clients where code_client = $1", [code]);
  return result.rows[0] ?? null;
};

export const getClientByEmail = async (email: string) => {
  const result = await pool.query("SELECT * FROM clients where email = $1", [email]);
  return result.rows[0] ?? null;
};


export const createClientInDB = async (
    client: Client
): Promise<Client> => {
    const query = `
    INSERT INTO clients (
      nom,
      prenom,
      email,
      code_client,
      societe,
      telephone
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

    const values = [
      client.nom,
      client.prenom,
      client.email,
      client.code_client,
      client.societe,
      client.telephone
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const deleteClientInDB = async (
    code_client: string
): Promise<Client> => {
    const query = `
    DELETE FROM clients
      WHERE code_client = $1
    RETURNING *;
  `;

    const result = await pool.query(query, [code_client]);
    return result.rows[0];
};

