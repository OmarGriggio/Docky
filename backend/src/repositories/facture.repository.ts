import { pool } from "../config/database";

export const getFacturesFromDB = async () => {
  const result = await pool.query("SELECT * FROM factures");
  return result.rows;
};

export const getFactureByIdFromDB = async (id: number) => {
  const result = await pool.query("SELECT * FROM factures WHERE id = $1", [id]);
  return result.rows[0] ?? null;
};