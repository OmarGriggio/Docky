import { pool } from "../../shared/config/database";

export const getDocumentLignesFromDB = async (id_entreprise: number) => {
  const result = await pool.query("SELECT * FROM document_lignes WHERE id_entreprise = $1", [id_entreprise]);
  return result.rows;
};

export const getLignesByDocumentIdFromDB = async (id_document: number) => {
  const result = await pool.query("SELECT * FROM document_lignes WHERE id_document = $1", [id_document]);
  return result.rows;
};
