import { pool } from "../../shared/config/database";
import { ResourceUnit } from "./resource_unit.types";

export const getUnitsFromDB = async (company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM resource_units WHERE company_id = $1 ORDER BY label"
    : "SELECT * FROM resource_units WHERE company_id = $1 AND is_active = true ORDER BY label";
  const result = await pool.query(query, [company_id]);
  return result.rows;
};

// Case-insensitive on purpose - see addUnitServ, this is what lets picking
// an already-there label (typed with different casing) resolve to the
// existing row instead of creating a near-duplicate.
export const getUnitByLabelFromDB = async (label: string, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM resource_units WHERE LOWER(label) = LOWER($1) AND company_id = $2",
    [label, company_id]
  );
  return result.rows[0] ?? null;
};

export const createUnitInDB = async (unit: Omit<ResourceUnit, "id">): Promise<ResourceUnit> => {
  const query = `
    INSERT INTO resource_units (company_id, label, is_active)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const result = await pool.query(query, [unit.company_id, unit.label, unit.is_active]);
  return result.rows[0];
};
