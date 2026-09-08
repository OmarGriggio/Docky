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

export const getResourceByCodeFromDB = async (code: string, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM resources WHERE code = $1 AND company_id = $2",
    [code, company_id]
  );
  return result.rows[0] ?? null;
};

export const createResourceInDB = async (
  resource: Omit<Resource, "id">
): Promise<Resource> => {
  const query = `
    INSERT INTO resources (
      company_id,
      parent_resource_id,
      type,
      code,
      name,
      unit,
      selling_price,
      purchase_price,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    resource.company_id,
    resource.parent_resource_id,
    resource.type,
    resource.code,
    resource.name,
    resource.unit,
    resource.selling_price,
    resource.purchase_price,
    resource.is_active
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
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
