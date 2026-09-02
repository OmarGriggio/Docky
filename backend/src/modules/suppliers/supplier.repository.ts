import { pool } from "../../shared/config/database";
import { Supplier } from "./supplier.types";

export const getSuppliersFromDB = async (company_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM suppliers WHERE company_id = $1"
    : "SELECT * FROM suppliers WHERE company_id = $1 AND is_active = true";
  const result = await pool.query(query, [company_id]);
  return result.rows;
};

export const getSupplierByCode = async (code: string) => {
  const result = await pool.query("SELECT * FROM suppliers WHERE supplier_code = $1", [code]);
  return result.rows[0] ?? null;
};

export const getSupplierByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM suppliers WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

export const archiveSupplierInDB = async (
  id: number,
  company_id: number
): Promise<Supplier> => {
  const query = `
    UPDATE suppliers SET is_active = false
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const unarchiveSupplierInDB = async (
  id: number,
  company_id: number
): Promise<Supplier> => {
  const query = `
    UPDATE suppliers SET is_active = true
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const createSupplierInDB = async (
  supplier: Omit<Supplier, "id">
): Promise<Supplier> => {
  const query = `
    INSERT INTO suppliers (
      company_id,
      supplier_code,
      name,
      category
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  const values = [
    supplier.company_id,
    supplier.supplier_code,
    supplier.name,
    supplier.category
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
