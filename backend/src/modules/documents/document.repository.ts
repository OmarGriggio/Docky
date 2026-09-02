import { pool } from "../../shared/config/database";
import { Document } from "./document.types";

export const getDocumentsFromDB = async (company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM documents WHERE company_id = $1"
    : "SELECT * FROM documents WHERE company_id = $1 AND is_active = true";
  const result = await pool.query(query, [company_id]);
  return result.rows;
};

export const getDocumentsByTypeFromDB = async (type: string, company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM documents WHERE type = $1 AND company_id = $2"
    : "SELECT * FROM documents WHERE type = $1 AND company_id = $2 AND is_active = true";
  const result = await pool.query(query, [type, company_id]);
  return result.rows;
};

export const getDocumentByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM documents WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

export const getDocumentByNumberFromDB = async (number: string) => {
  const result = await pool.query("SELECT * FROM documents WHERE number = $1", [number]);
  return result.rows[0] ?? null;
};

export const updateDocumentTotalsInDB = async (
  id: number,
  company_id: number,
  amount_excl_vat: number,
  amount_incl_vat: number
): Promise<Document> => {
  const query = `
    UPDATE documents SET amount_excl_vat = $1, amount_incl_vat = $2
      WHERE id = $3 AND company_id = $4
    RETURNING *;
  `;

  const result = await pool.query(query, [amount_excl_vat, amount_incl_vat, id, company_id]);
  return result.rows[0];
};

export const archiveDocumentInDB = async (id: number, company_id: number): Promise<Document> => {
  const query = `
    UPDATE documents SET is_active = false
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const unarchiveDocumentInDB = async (id: number, company_id: number): Promise<Document> => {
  const query = `
    UPDATE documents SET is_active = true
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const createDocumentInDB = async (
  document: Omit<Document, "id">
): Promise<Document> => {
  const query = `
    INSERT INTO documents (
      company_id,
      client_id,
      project_id,
      parent_document_id,
      type,
      number,
      date,
      amount_excl_vat,
      amount_incl_vat,
      discount,
      status,
      introduction,
      conclusion
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *;
  `;

  const values = [
    document.company_id,
    document.client_id,
    document.project_id,
    document.parent_document_id,
    document.type,
    document.number,
    document.date,
    document.amount_excl_vat,
    document.amount_incl_vat,
    document.discount,
    document.status,
    document.introduction,
    document.conclusion
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
