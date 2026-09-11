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
    INSERT INTO project_resources (company_id, project_id, resource_id, quantity, unit_price)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    projectResource.company_id,
    projectResource.project_id,
    projectResource.resource_id,
    projectResource.quantity,
    projectResource.unit_price
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

// The only field meant to be corrected by hand as a project runs (e.g. more
// hours than planned) - see the migration's comment on
// project_resources.quantity.
export const updateProjectResourceQuantityInDB = async (
  id: number,
  company_id: number,
  quantity: number
): Promise<ProjectResource> => {
  const query = `
    UPDATE project_resources SET quantity = $1
      WHERE id = $2 AND company_id = $3
    RETURNING *;
  `;

  const result = await pool.query(query, [quantity, id, company_id]);
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
