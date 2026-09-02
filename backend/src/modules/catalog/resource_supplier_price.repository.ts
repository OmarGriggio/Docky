import { pool } from "../../shared/config/database";

export const getResourceSupplierPricesFromDB = async (company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM resource_supplier_prices WHERE company_id = $1",
    [company_id]
  );
  return result.rows;
};

export const getResourceSupplierPricesByResourceIdFromDB = async (resource_id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM resource_supplier_prices WHERE resource_id = $1 AND company_id = $2",
    [resource_id, company_id]
  );
  return result.rows;
};
