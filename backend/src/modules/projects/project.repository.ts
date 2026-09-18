import { pool } from "../../shared/config/database";
import { Project, ProjectListItem, CreateProjectData, UpdateProjectData } from "./project.types";

// Ordered so the chantiers needing attention soonest surface first: among
// IN_PROGRESS projects (COMPLETED ones always sort last, regardless of their
// own dates - they're done, nothing left to plan), by the date_start closest
// to right now across that chantier's own sections - whichever is nearest in
// either direction, an overdue section is just as worth surfacing as an
// upcoming one. The LATERAL join picks that single closest section per
// project (a plain MIN() can't express "closest to now", only "earliest
// overall"); projects with no dated section at all sort after those that
// have one, but still ahead of COMPLETED. Without an explicit ORDER BY,
// Postgres doesn't guarantee row order at all - two calls back-to-back
// (list, then reload right after a save) can come back differently ordered,
// which reads as the table shuffling itself.
export const getProjectsFromDB = async (company_id: number, includeArchived = false): Promise<ProjectListItem[]> => {
  const query = includeArchived
    ? `SELECT p.*, pt.label AS project_type, closest.date_start AS closest_section_date, quote.number AS quote_number
       FROM projects p
       LEFT JOIN project_types pt ON pt.id = p.project_type_id
       LEFT JOIN LATERAL (
         SELECT ds.date_start
         FROM document_sections ds
         WHERE ds.document_id = p.document_id AND ds.date_start IS NOT NULL AND ds.is_active = true
         ORDER BY ABS(EXTRACT(EPOCH FROM (ds.date_start - NOW())))
         LIMIT 1
       ) closest ON true
       LEFT JOIN documents pd ON pd.id = p.document_id
       LEFT JOIN documents quote ON quote.id = pd.parent_document_id
       WHERE p.company_id = $1
       ORDER BY (p.status = 'COMPLETED'), closest.date_start IS NULL, ABS(EXTRACT(EPOCH FROM (closest.date_start - NOW()))), p.id`
    : `SELECT p.*, pt.label AS project_type, closest.date_start AS closest_section_date, quote.number AS quote_number
       FROM projects p
       LEFT JOIN project_types pt ON pt.id = p.project_type_id
       LEFT JOIN LATERAL (
         SELECT ds.date_start
         FROM document_sections ds
         WHERE ds.document_id = p.document_id AND ds.date_start IS NOT NULL AND ds.is_active = true
         ORDER BY ABS(EXTRACT(EPOCH FROM (ds.date_start - NOW())))
         LIMIT 1
       ) closest ON true
       LEFT JOIN documents pd ON pd.id = p.document_id
       LEFT JOIN documents quote ON quote.id = pd.parent_document_id
       WHERE p.company_id = $1 AND p.is_active = true
       ORDER BY (p.status = 'COMPLETED'), closest.date_start IS NULL, ABS(EXTRACT(EPOCH FROM (closest.date_start - NOW()))), p.id`;
  const result = await pool.query(query, [company_id]);
  return result.rows;
};

export const getProjectByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    `SELECT p.*, pt.label AS project_type
     FROM projects p
     LEFT JOIN project_types pt ON pt.id = p.project_type_id
     WHERE p.id = $1 AND p.company_id = $2`,
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

// Used to check a project's status from the PROJECT document it's backed
// by (see document.service.ts's addDocumentServ, which validates an
// INVOICE's parent_document_id this way).
export const getProjectByDocumentIdFromDB = async (document_id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM projects WHERE document_id = $1 AND company_id = $2",
    [document_id, company_id]
  );
  return result.rows[0] ?? null;
};

export const createProjectInDB = async (
  project: CreateProjectData & { company_id: number; document_id: number }
): Promise<Project> => {
  const query = `
    INSERT INTO projects (
      company_id,
      document_id,
      client_id,
      project_type_id,
      name,
      note
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [
    project.company_id,
    project.document_id,
    project.client_id,
    project.project_type_id,
    project.name,
    project.note ?? null
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const updateProjectInDB = async (
  id: number,
  company_id: number,
  data: UpdateProjectData
): Promise<Project> => {
  // Same shape as getProjectsFromDB's own SELECT (project_type joined in,
  // not just project_type_id) - the frontend's cell-editable project list
  // replaces a row with this response directly instead of reloading the
  // whole list, and needs the label to display, not just the id.
  const query = `
    WITH updated AS (
      UPDATE projects SET
        name = $1,
        project_type_id = $2
        WHERE id = $3 AND company_id = $4
      RETURNING *
    )
    SELECT u.*, pt.label AS project_type
    FROM updated u
    LEFT JOIN project_types pt ON pt.id = u.project_type_id;
  `;

  const result = await pool.query(query, [data.name, data.project_type_id, id, company_id]);
  return result.rows[0];
};

export const archiveProjectInDB = async (
  id: number,
  company_id: number
): Promise<Project> => {
  const query = `
    UPDATE projects SET is_active = false
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const unarchiveProjectInDB = async (
  id: number,
  company_id: number
): Promise<Project> => {
  const query = `
    UPDATE projects SET is_active = true
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

// Locks in the project's status as done - see the migration's comment on
// projects.status for why this gates invoicing. One-way for now: no
// "reopen" (would need deciding what happens to an invoice already created
// from it in the meantime).
export const completeProjectInDB = async (
  id: number,
  company_id: number
): Promise<Project> => {
  const query = `
    UPDATE projects SET status = 'COMPLETED'
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};
