import { pool } from "../../shared/config/database";
import { DocumentSection, UpdateDocumentSectionData, UpdateDocumentSectionNoteData, SectionWithProject } from "./document_section.types";

export const getSectionsByDocumentIdFromDB = async (document_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM document_sections WHERE document_id = $1 ORDER BY position"
    : "SELECT * FROM document_sections WHERE document_id = $1 AND is_active = true ORDER BY position";
  const result = await pool.query(query, [document_id]);
  return result.rows;
};

// The calendar's own "drag onto a date" sidebar (see calendar.ts on the
// frontend) - a section still has no schedule, but its chantier is
// actively being worked on (a COMPLETED one's quantities are locked, an
// archived one is done for good). Joins projects via documents.id =
// projects.document_id (a chantier's own PROJECT document), not
// document_sections.document_id directly to project_id - there's no such
// column, a section only ever points at its own document.
export const getUnscheduledSectionsFromDB = async (company_id: number): Promise<SectionWithProject[]> => {
  const query = `
    SELECT ds.*, p.id AS project_id, p.name AS project_name
    FROM document_sections ds
    JOIN documents d ON d.id = ds.document_id
    JOIN projects p ON p.document_id = d.id
    WHERE ds.company_id = $1
      AND ds.is_active = true
      AND ds.date_start IS NULL
      AND p.status = 'IN_PROGRESS'
      AND p.is_active = true
    ORDER BY p.name, ds.position;
  `;
  const result = await pool.query(query, [company_id]);
  return result.rows;
};

// The calendar's own initial load (calendar.ts) - every already-scheduled
// section, any chantier status (a COMPLETED one's own past work is still
// worth showing, just not draggable-onto anymore - see
// getUnscheduledSectionsFromDB above for that side).
export const getScheduledSectionsFromDB = async (company_id: number): Promise<SectionWithProject[]> => {
  const query = `
    SELECT ds.*, p.id AS project_id, p.name AS project_name
    FROM document_sections ds
    JOIN documents d ON d.id = ds.document_id
    JOIN projects p ON p.document_id = d.id
    WHERE ds.company_id = $1
      AND ds.is_active = true
      AND ds.date_start IS NOT NULL
      AND ds.date_end IS NOT NULL
      AND p.is_active = true
    ORDER BY ds.date_start;
  `;
  const result = await pool.query(query, [company_id]);
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
      description,
      date_start,
      date_end,
      note,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    section.company_id,
    section.document_id,
    section.position,
    section.title,
    section.description,
    section.date_start,
    section.date_end,
    section.note,
    section.is_active
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const updateSectionInDB = async (
  id: number,
  company_id: number,
  data: UpdateDocumentSectionData
): Promise<DocumentSection> => {
  const query = `
    UPDATE document_sections SET date_start = $1, date_end = $2
      WHERE id = $3 AND company_id = $4
    RETURNING *;
  `;

  const result = await pool.query(query, [data.date_start, data.date_end, id, company_id]);
  return result.rows[0];
};

export const updateSectionNoteInDB = async (
  id: number,
  company_id: number,
  data: UpdateDocumentSectionNoteData
): Promise<DocumentSection> => {
  const query = `
    UPDATE document_sections SET note = $1
      WHERE id = $2 AND company_id = $3
    RETURNING *;
  `;

  const result = await pool.query(query, [data.note, id, company_id]);
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
