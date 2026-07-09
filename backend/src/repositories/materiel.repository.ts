import { pool } from "../config/database";

export const getMaterielsFromDB = async () => {
  const result = await pool.query("SELECT * FROM materiels");
  return result.rows;
};