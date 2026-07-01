import { pool } from "../config/database";

export const getClientsFromDB = async () => {
  const result = await pool.query("SELECT * FROM clients");
  return result.rows;
};