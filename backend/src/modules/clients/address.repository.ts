import { pool } from "../../shared/config/database";
import { Address, UpdateAddressData } from "./address.types";

export const getAddressesFromDB = async (company_id: number) => {
  const result = await pool.query("SELECT * FROM addresses WHERE company_id = $1 ORDER BY id", [company_id]);
  return result.rows;
};

export const getAddressesByClientIdFromDB = async (client_id: number) => {
  const result = await pool.query("SELECT * FROM addresses WHERE client_id = $1 ORDER BY id", [client_id]);
  return result.rows;
};

export const getAddressByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM addresses WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

export const updateAddressInDB = async (id: number, company_id: number, data: UpdateAddressData): Promise<Address> => {
  const query = `
    UPDATE addresses SET attention = $1, street = $2, postal_code = $3, city = $4, country = $5
      WHERE id = $6 AND company_id = $7
    RETURNING *;
  `;

  const result = await pool.query(query, [data.attention, data.street, data.postal_code, data.city, data.country, id, company_id]);
  return result.rows[0];
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

export const createAddressInDB = async (
  address: Omit<Address, "id">
): Promise<Address> => {
  const query = `
    INSERT INTO addresses (
      company_id,
      client_id,
      is_primary,
      attention,
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
    address.is_primary,
    address.attention,
    address.street,
    address.postal_code,
    address.city,
    address.country
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
