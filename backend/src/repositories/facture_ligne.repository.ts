import { pool } from "../config/database";

export const getFacturesLignesFromDB = async () => {
  const result = await pool.query("SELECT * FROM factures_lignes");
  return result.rows;
};

export const getLignesByFactureIdFromDB = async (id_facture: number) => {
  const result = await pool.query(`SELECT * FROM factures_lignes WHERE id_facture = '${id_facture}'`);
  return result.rows;
};


