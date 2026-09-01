import { pool } from "../../shared/config/database";
import { Ressource } from "./ressource.types";

export const getRessourcesFromDB = async (id_entreprise: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM ressources WHERE id_entreprise = $1"
    : "SELECT * FROM ressources WHERE id_entreprise = $1 AND actif = true";
  const result = await pool.query(query, [id_entreprise]);
  return result.rows;
};

export const getRessourcesByTypeFromDB = async (type: string, id_entreprise: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM ressources WHERE type = $1 AND id_entreprise = $2"
    : "SELECT * FROM ressources WHERE type = $1 AND id_entreprise = $2 AND actif = true";
  const result = await pool.query(query, [type, id_entreprise]);
  return result.rows;
};

export const getRessourceByIdFromDB = async (id: number, id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM ressources WHERE id = $1 AND id_entreprise = $2",
    [id, id_entreprise]
  );
  return result.rows[0] ?? null;
};

export const archiveRessourceInDB = async (id: number, id_entreprise: number): Promise<Ressource> => {
  const query = `
    UPDATE ressources SET actif = false
      WHERE id = $1 AND id_entreprise = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, id_entreprise]);
  return result.rows[0];
};

export const unarchiveRessourceInDB = async (id: number, id_entreprise: number): Promise<Ressource> => {
  const query = `
    UPDATE ressources SET actif = true
      WHERE id = $1 AND id_entreprise = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, id_entreprise]);
  return result.rows[0];
};
