import { pool } from "../config/database";

export const getCatalogueFromDB = async () => {
  const result = await pool.query("SELECT * FROM catalogue");
  return result.rows;
};

export const getCatalogueByTypeFromDB = async (type: string) => {
  const result = await pool.query("SELECT * FROM catalogue WHERE type = $1", [type]);
  return result.rows;
};
