import { pool } from "../../shared/config/database";
import { Resource } from "./resource.types";

export const getResourcesFromDB = async (company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM resources WHERE company_id = $1"
    : "SELECT * FROM resources WHERE company_id = $1 AND is_active = true";
  const result = await pool.query(query, [company_id]);
  return result.rows;
};

export const getResourcesByTypeFromDB = async (type: string, company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM resources WHERE type = $1 AND company_id = $2"
    : "SELECT * FROM resources WHERE type = $1 AND company_id = $2 AND is_active = true";
  const result = await pool.query(query, [type, company_id]);
  return result.rows;
};

export const getResourceByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM resources WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

export const archiveResourceInDB = async (id: number, company_id: number): Promise<Resource> => {
  const query = `
    UPDATE resources SET is_active = false
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const unarchiveResourceInDB = async (id: number, company_id: number): Promise<Resource> => {
  const query = `
    UPDATE resources SET is_active = true
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};
