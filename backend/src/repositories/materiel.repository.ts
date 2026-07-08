import { pool } from "../config/database";

export const getMaterielsFromDB = async () => {
  const result = await pool.query("SELECT * FROM materiel");
  return result.rows;
};