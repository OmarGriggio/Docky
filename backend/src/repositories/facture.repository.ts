import { pool } from "../config/database";

export const getFacturesFromDB = async () => {
  const result = await pool.query("SELECT * FROM factures");
  return result.rows;
};