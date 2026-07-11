import { pool } from "../config/database";

export const getRessourcesFromDB = async () => {
  const result = await pool.query("SELECT * FROM ressources");
  return result.rows;
};

export const getRessourcesByTypeFromDB = async (type: string) => {
  const result = await pool.query("SELECT * FROM ressources WHERE type = $1", [type]);
  return result.rows;
};
