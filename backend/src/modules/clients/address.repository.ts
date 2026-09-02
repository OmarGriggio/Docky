import { pool } from "../../shared/config/database";
import { Address } from "./address.types";

export const getAddressesFromDB = async (company_id: number) => {
  const result = await pool.query("SELECT * FROM addresses WHERE company_id = $1", [company_id]);
  return result.rows;
};

export const getAddressesByClientIdFromDB = async (client_id: number) => {
  const result = await pool.query("SELECT * FROM addresses WHERE client_id = $1", [client_id]);
  return result.rows;
};

export const getAddressesBySupplierIdFromDB = async (supplier_id: number) => {
  const result = await pool.query("SELECT * FROM addresses WHERE supplier_id = $1", [supplier_id]);
  return result.rows;
};

export const getAddressByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM addresses WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

export const deleteAddressInDB = async (id: number, company_id: number): Promise<Address> => {
  const query = `
    DELETE FROM addresses
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const unsetPrimaryForClientInDB = async (client_id: number, company_id: number) => {
  await pool.query(
    "UPDATE addresses SET is_primary = false WHERE client_id = $1 AND company_id = $2 AND is_primary = true",
    [client_id, company_id]
  );
};

export const unsetPrimaryForSupplierInDB = async (supplier_id: number, company_id: number) => {
  await pool.query(
    "UPDATE addresses SET is_primary = false WHERE supplier_id = $1 AND company_id = $2 AND is_primary = true",
    [supplier_id, company_id]
  );
};

export const createAddressInDB = async (
  address: Omit<Address, "id">
): Promise<Address> => {
  const query = `
    INSERT INTO addresses (
      company_id,
      client_id,
      supplier_id,
      is_primary,
      street,
      postal_code,
      city,
      country
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    address.company_id,
    address.client_id,
    address.supplier_id,
    address.is_primary,
    address.street,
    address.postal_code,
    address.city,
    address.country
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
