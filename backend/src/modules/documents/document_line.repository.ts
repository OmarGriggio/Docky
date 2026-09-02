import { pool } from "../../shared/config/database";
import { DocumentLine } from "./document_line.types";

export const getDocumentLinesFromDB = async (company_id: number) => {
  const result = await pool.query("SELECT * FROM document_lines WHERE company_id = $1", [company_id]);
  return result.rows;
};

export const getLinesByDocumentIdFromDB = async (document_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM document_lines WHERE document_id = $1"
    : "SELECT * FROM document_lines WHERE document_id = $1 AND is_active = true";
  const result = await pool.query(query, [document_id]);
  return result.rows;
};

export const getLineByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM document_lines WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

export const getNextPositionForDocumentFromDB = async (document_id: number): Promise<number> => {
  const result = await pool.query(
    "SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM document_lines WHERE document_id = $1",
    [document_id]
  );
  return Number(result.rows[0].next_position);
};

export const createLineInDB = async (
  line: Omit<DocumentLine, "id">
): Promise<DocumentLine> => {
  const query = `
    INSERT INTO document_lines (
      company_id,
      document_id,
      position,
      type,
      label,
      quantity,
      unit,
      unit_price,
      discount,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const values = [
    line.company_id,
    line.document_id,
    line.position,
    line.type,
    line.label,
    line.quantity,
    line.unit,
    line.unit_price,
    line.discount,
    line.is_active
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const archiveLineInDB = async (id: number, company_id: number): Promise<DocumentLine> => {
  const query = `
    UPDATE document_lines SET is_active = false
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const unarchiveLineInDB = async (id: number, company_id: number): Promise<DocumentLine> => {
  const query = `
    UPDATE document_lines SET is_active = true
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};
