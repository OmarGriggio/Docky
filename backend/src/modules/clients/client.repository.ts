import { pool } from "../../shared/config/database";
import {Client} from "./client.types"

export const getClientsFromDB = async (id_entreprise: number) => {
  const result = await pool.query("SELECT * FROM clients where id_entreprise = $1", [id_entreprise]);
  return result.rows;
};

export const getClientByIdFromDB = async (id: number, id_entreprise: number) => {
  const result = await pool.query("SELECT * FROM clients where id = $1 AND id_entreprise = $2", [id, id_entreprise]);
  return result.rows[0] ?? null;
};

export const getClientByNumClient = async (num_client: string) => {
  const result = await pool.query("SELECT * FROM clients where num_client = $1", [num_client]);
  return result.rows[0] ?? null;
};

export const getClientByNumClientForEntreprise = async (num_client: string, id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM clients where num_client = $1 AND id_entreprise = $2",
    [num_client, id_entreprise]
  );
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
      id_entreprise,
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
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

    const values = [
      client.id_entreprise,
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
    num_client: string,
    id_entreprise: number
): Promise<Client> => {
    const query = `
    DELETE FROM clients
      WHERE num_client = $1 AND id_entreprise = $2
    RETURNING *;
  `;

    const result = await pool.query(query, [num_client, id_entreprise]);
    return result.rows[0];
};
