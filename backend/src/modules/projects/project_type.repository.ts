import { pool } from "../../shared/config/database";
import { ProjectType } from "./project_type.types";

export const getProjectTypesFromDB = async () => {
  const result = await pool.query("SELECT * FROM project_types");
  return result.rows;
};

export const getProjectTypeByIdFromDB = async (id: number) => {
  const result = await pool.query(
    "SELECT * FROM project_types WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
};

export const getProjectTypeByLabel = async (label: string) => {
  const result = await pool.query(
    "SELECT * FROM project_types WHERE label = $1",
    [label]
  );
  return result.rows[0] ?? null;
};

export const createProjectTypeInDB = async (
  projectType: Omit<ProjectType, "id">
): Promise<ProjectType> => {
  const query = `
    INSERT INTO project_types (label)
    VALUES ($1)
    RETURNING *;
  `;

  const result = await pool.query(query, [projectType.label]);
  return result.rows[0];
};

export const deleteProjectTypeInDB = async (id: number) => {
  await pool.query(
    "UPDATE projects SET project_type_id = NULL WHERE project_type_id = $1",
    [id]
  );

  const result = await pool.query(
    "DELETE FROM project_types WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows[0] ?? null;
};
