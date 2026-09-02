import { pool } from "../../shared/config/database";
import { Project, CreateProjectData } from "./project.types";

export const getProjectsFromDB = async (company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? `SELECT p.*, pt.label AS project_type
       FROM projects p
       LEFT JOIN project_types pt ON pt.id = p.project_type_id
       WHERE p.company_id = $1`
    : `SELECT p.*, pt.label AS project_type
       FROM projects p
       LEFT JOIN project_types pt ON pt.id = p.project_type_id
       WHERE p.company_id = $1 AND p.is_active = true`;
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

export const createProjectInDB = async (
  project: CreateProjectData & { company_id: number }
): Promise<Project> => {
  const query = `
    INSERT INTO projects (
      company_id,
      client_id,
      project_type_id,
      name,
      note,
      same_address_as_client,
      street,
      postal_code,
      city,
      country
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const values = [
    project.company_id,
    project.client_id,
    project.project_type_id,
    project.name,
    project.note ?? null,
    project.same_address_as_client,
    project.street ?? null,
    project.postal_code ?? null,
    project.city ?? null,
    project.country ?? null
  ];

  const result = await pool.query(query, values);
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
