import { pool } from "../../shared/config/database";
import { Resource, UpdateResourceData } from "./resource.types";

export const getResourcesFromDB = async (company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM resources WHERE company_id = $1 ORDER BY id"
    : "SELECT * FROM resources WHERE company_id = $1 AND is_active = true ORDER BY id";
  const result = await pool.query(query, [company_id]);
  return result.rows;
};

export const getResourcesByTypeFromDB = async (type: string, company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM resources WHERE type = $1 AND company_id = $2 ORDER BY id"
    : "SELECT * FROM resources WHERE type = $1 AND company_id = $2 AND is_active = true ORDER BY id";
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

// Active only - matches the partial unique index from
// zz_migrations/004_resource_code_unique_when_active.sql: an archived
// resource's code is free to reuse.
export const getResourceByCodeFromDB = async (code: string, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM resources WHERE code = $1 AND company_id = $2 AND is_active = true",
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

export const updateResourceInDB = async (id: number, company_id: number, data: UpdateResourceData): Promise<Resource> => {
  const query = `
    UPDATE resources SET code = $1, name = $2, unit = $3, selling_price = $4, purchase_price = $5
      WHERE id = $6 AND company_id = $7
    RETURNING *;
  `;

  const result = await pool.query(query, [data.code, data.name, data.unit, data.selling_price, data.purchase_price, id, company_id]);
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
