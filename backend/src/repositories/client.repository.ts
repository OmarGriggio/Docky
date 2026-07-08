import { pool } from "../config/database";
import {Client} from "../types/client"

export const getClientsFromDB = async () => {
  const result = await pool.query("SELECT * FROM clients");
  return result.rows;
};

export const getClientByCode = async (code: string) => {
  const result = await pool.query(`SELECT * FROM clients where code_client = '${code}'`);
  return result.rows[0] ?? null;
};

export const getClientByEmail = async (email: string) => {
  const result = await pool.query(`SELECT * FROM clients where email = '${email}'`);
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
    VALUES ('${client.nom}', '${client.prenom}', '${client.email}', '${client.code_client}', '${client.societe}', '${client.telephone}')
    RETURNING *;
  `;

    const result = await pool.query(query);
    return result.rows[0];
};

export const deleteClientInDB = async (
    code_client: string
): Promise<Client> => {
    const query = `
    DELETE FROM clients
      WHERE code_client = '${code_client}'
    RETURNING *;
  `;

    const result = await pool.query(query);
    return result.rows[0];
};

