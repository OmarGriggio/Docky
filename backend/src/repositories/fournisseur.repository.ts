import { pool } from "../config/database";

export const getFournisseursFromDB = async () => {
  const result = await pool.query("SELECT * FROM fournisseurs");
  return result.rows;
};