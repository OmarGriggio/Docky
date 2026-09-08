import { pool } from "../../shared/config/database";
import { ProjectResource } from "./project_resource.types";

export const getResourcesForProjectFromDB = async (project_id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM project_resources WHERE project_id = $1 AND company_id = $2",
    [project_id, company_id]
  );
  return result.rows;
};

export const getProjectResourceByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM project_resources WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

export const getProjectResourceLinkFromDB = async (project_id: number, resource_id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM project_resources WHERE project_id = $1 AND resource_id = $2 AND company_id = $3",
    [project_id, resource_id, company_id]
  );
  return result.rows[0] ?? null;
};

export const createProjectResourceInDB = async (
  projectResource: Omit<ProjectResource, "id">
): Promise<ProjectResource> => {
  const query = `
    INSERT INTO project_resources (company_id, project_id, resource_id)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const values = [projectResource.company_id, projectResource.project_id, projectResource.resource_id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const deleteProjectResourceInDB = async (id: number, company_id: number): Promise<ProjectResource> => {
  const query = `
    DELETE FROM project_resources
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};
