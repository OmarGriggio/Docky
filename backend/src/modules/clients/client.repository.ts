import { pool } from "../../shared/config/database";
import {Client} from "./client.types"

export const getClientsFromDB = async () => {
  const result = await pool.query("SELECT * FROM clients");
  return result.rows;
};

export const getClientByIdFromDB = async (id: number) => {
  const result = await pool.query("SELECT * FROM clients where id = $1", [id]);
  return result.rows[0] ?? null;
};

export const getClientByNumClient = async (num_client: string) => {
  const result = await pool.query("SELECT * FROM clients where num_client = $1", [num_client]);
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
      num_client,
      type,
      societe,
      tva,
      nom,
      prenom,
      civilite,
      email,
      telephone,
      remarque
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

    const values = [
      client.num_client,
      client.type,
      client.societe,
      client.tva,
      client.nom,
      client.prenom,
      client.civilite,
      client.email,
      client.telephone,
      client.remarque
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const deleteClientInDB = async (
    num_client: string
): Promise<Client> => {
    const query = `
    DELETE FROM clients
      WHERE num_client = $1
    RETURNING *;
  `;

    const result = await pool.query(query, [num_client]);
    return result.rows[0];
};
