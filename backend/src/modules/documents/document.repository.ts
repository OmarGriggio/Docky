import { pool } from "../../shared/config/database";
import { Document } from "./document.types";

export const getDocumentsFromDB = async (id_entreprise: number) => {
  const result = await pool.query("SELECT * FROM documents WHERE id_entreprise = $1", [id_entreprise]);
  return result.rows;
};

export const getDocumentsByTypeFromDB = async (type: string, id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM documents WHERE type = $1 AND id_entreprise = $2",
    [type, id_entreprise]
  );
  return result.rows;
};

export const getDocumentByIdFromDB = async (id: number) => {
  const result = await pool.query("SELECT * FROM documents WHERE id = $1", [id]);
  return result.rows[0] ?? null;
};

export const getDocumentByNumeroFromDB = async (numero: string) => {
  const result = await pool.query("SELECT * FROM documents WHERE numero = $1", [numero]);
  return result.rows[0] ?? null;
};

export const createDocumentInDB = async (
  document: Omit<Document, "id">
): Promise<Document> => {
  const query = `
    INSERT INTO documents (
      id_entreprise,
      id_client,
      id_document_parent,
      type,
      numero,
      date,
      montant_ht,
      montant_ttc,
      rabais,
      statut
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const values = [
    document.id_entreprise,
    document.id_client,
    document.id_document_parent,
    document.type,
    document.numero,
    document.date,
    document.montant_ht,
    document.montant_ttc,
    document.rabais,
    document.statut
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
