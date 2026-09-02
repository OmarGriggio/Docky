import { pool } from "../../shared/config/database";
import { Document } from "./document.types";

export const getDocumentsFromDB = async (id_entreprise: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM documents WHERE id_entreprise = $1"
    : "SELECT * FROM documents WHERE id_entreprise = $1 AND actif = true";
  const result = await pool.query(query, [id_entreprise]);
  return result.rows;
};

export const getDocumentsByTypeFromDB = async (type: string, id_entreprise: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM documents WHERE type = $1 AND id_entreprise = $2"
    : "SELECT * FROM documents WHERE type = $1 AND id_entreprise = $2 AND actif = true";
  const result = await pool.query(query, [type, id_entreprise]);
  return result.rows;
};

export const getDocumentByIdFromDB = async (id: number, id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM documents WHERE id = $1 AND id_entreprise = $2",
    [id, id_entreprise]
  );
  return result.rows[0] ?? null;
};

export const getDocumentByNumeroFromDB = async (numero: string) => {
  const result = await pool.query("SELECT * FROM documents WHERE numero = $1", [numero]);
  return result.rows[0] ?? null;
};

export const updateDocumentTotalsInDB = async (
  id: number,
  id_entreprise: number,
  montant_ht: number,
  montant_ttc: number
): Promise<Document> => {
  const query = `
    UPDATE documents SET montant_ht = $1, montant_ttc = $2
      WHERE id = $3 AND id_entreprise = $4
    RETURNING *;
  `;

  const result = await pool.query(query, [montant_ht, montant_ttc, id, id_entreprise]);
  return result.rows[0];
};

export const archiveDocumentInDB = async (id: number, id_entreprise: number): Promise<Document> => {
  const query = `
    UPDATE documents SET actif = false
      WHERE id = $1 AND id_entreprise = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, id_entreprise]);
  return result.rows[0];
};

export const unarchiveDocumentInDB = async (id: number, id_entreprise: number): Promise<Document> => {
  const query = `
    UPDATE documents SET actif = true
      WHERE id = $1 AND id_entreprise = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, id_entreprise]);
  return result.rows[0];
};

export const createDocumentInDB = async (
  document: Omit<Document, "id">
): Promise<Document> => {
  const query = `
    INSERT INTO documents (
      id_entreprise,
      id_client,
      id_chantier,
      id_document_parent,
      type,
      numero,
      date,
      montant_ht,
      montant_ttc,
      rabais,
      statut,
      introduction,
      conclusion
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *;
  `;

  const values = [
    document.id_entreprise,
    document.id_client,
    document.id_chantier,
    document.id_document_parent,
    document.type,
    document.numero,
    document.date,
    document.montant_ht,
    document.montant_ttc,
    document.rabais,
    document.statut,
    document.introduction,
    document.conclusion
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
