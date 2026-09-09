import { pool } from "../../shared/config/database";
import { DocumentSection } from "./document_section.types";

export const getSectionsByDocumentIdFromDB = async (document_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM document_sections WHERE document_id = $1 ORDER BY position"
    : "SELECT * FROM document_sections WHERE document_id = $1 AND is_active = true ORDER BY position";
  const result = await pool.query(query, [document_id]);
  return result.rows;
};

export const getSectionByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM document_sections WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

export const getNextPositionForDocumentFromDB = async (document_id: number): Promise<number> => {
  const result = await pool.query(
    "SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM document_sections WHERE document_id = $1",
    [document_id]
  );
  return Number(result.rows[0].next_position);
};

export const createSectionInDB = async (
  section: Omit<DocumentSection, "id">
): Promise<DocumentSection> => {
  const query = `
    INSERT INTO document_sections (
      company_id,
      document_id,
      position,
      title,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    section.company_id,
    section.document_id,
    section.position,
    section.title,
    section.is_active
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const archiveSectionInDB = async (id: number, company_id: number): Promise<DocumentSection> => {
  const query = `
    UPDATE document_sections SET is_active = false
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const unarchiveSectionInDB = async (id: number, company_id: number): Promise<DocumentSection> => {
  const query = `
    UPDATE document_sections SET is_active = true
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};
