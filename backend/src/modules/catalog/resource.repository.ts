import { db } from "../../shared/config/database";
import { Resource, UpdateResourceData } from "./resource.types";

export const getResourcesFromDB = async (company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM resources WHERE company_id = $1 ORDER BY id"
    : "SELECT * FROM resources WHERE company_id = $1 AND is_active = true ORDER BY id";
  const result = await db().query(query, [company_id]);
  return result.rows;
};

export const getResourcesByTypeFromDB = async (type: string, company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM resources WHERE type = $1 AND company_id = $2 ORDER BY id"
    : "SELECT * FROM resources WHERE type = $1 AND company_id = $2 AND is_active = true ORDER BY id";
  const result = await db().query(query, [type, company_id]);
  return result.rows;
};

export const getResourceByIdFromDB = async (id: number, company_id: number) => {
  const result = await db().query(
    "SELECT * FROM resources WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

// Active only - matches the partial unique index from
// zz_migrations/000_base.sql (resources_company_id_code_active_key): an archived
// resource's code is free to reuse.
export const getResourceByCodeFromDB = async (code: string, company_id: number) => {
  const result = await db().query(
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
      reference,
      name,
      unit,
      selling_price,
      purchase_price,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const values = [
    resource.company_id,
    resource.parent_resource_id,
    resource.type,
    resource.code,
    resource.reference,
    resource.name,
    resource.unit,
    resource.selling_price,
    resource.purchase_price,
    resource.is_active
  ];

  const result = await db().query(query, values);
  return result.rows[0];
};

export const updateResourceInDB = async (id: number, company_id: number, data: UpdateResourceData): Promise<Resource> => {
  const query = `
    UPDATE resources SET reference = $1, name = $2, unit = $3, selling_price = $4, purchase_price = $5
      WHERE id = $6 AND company_id = $7
    RETURNING *;
  `;

  const result = await db().query(query, [data.reference, data.name, data.unit, data.selling_price, data.purchase_price, id, company_id]);
  return result.rows[0];
};

export const archiveResourceInDB = async (id: number, company_id: number): Promise<Resource> => {
  const query = `
    UPDATE resources SET is_active = false
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await db().query(query, [id, company_id]);
  return result.rows[0];
};

export const unarchiveResourceInDB = async (id: number, company_id: number): Promise<Resource> => {
  const query = `
    UPDATE resources SET is_active = true
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await db().query(query, [id, company_id]);
  return result.rows[0];
};

// Resource codes are generated (see resource.service.ts's addResourceServ),
// one company and prefix at a time - same lock as client numbers.
export const lockResourceCodingInDB = async (company_id: number, prefix: string): Promise<void> => {
  await db().query("SELECT pg_advisory_xact_lock($1, hashtext($2))", [company_id, `resource-code-${prefix}`]);
};

// The highest number among the company's codes with that prefix, archived
// resources included - null when there's none yet.
export const getLastResourceSequenceFromDB = async (company_id: number, pattern: string): Promise<number | null> => {
  const result = await db().query(
    "SELECT MAX(substring(code from $2)::int) AS last FROM resources WHERE company_id = $1 AND code ~ $2",
    [company_id, pattern]
  );
  return result.rows[0]?.last ?? null;
};
