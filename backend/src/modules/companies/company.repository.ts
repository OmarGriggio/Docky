import { pool } from "../../shared/config/database";
import { Company } from "./company.types";

export const getCompaniesFromDB = async () => {
  const result = await pool.query("SELECT * FROM companies");
  return result.rows;
};

export const getCompanyByIdFromDB = async (id: number) => {
  const result = await pool.query("SELECT * FROM companies where id = $1", [id]);
  return result.rows[0] ?? null;
};

export const createCompanyInDB = async (
    company: Omit<Company, "id">
): Promise<Company> => {
    const query = `
    INSERT INTO companies (
      name, email, phone, iban, street, postal_code, city, country, logo
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
    const values = [
      company.name,
      company.email,
      company.phone,
      company.iban,
      company.street,
      company.postal_code,
      company.city,
      company.country,
      company.logo
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
};

export const updateCompanyInDB = async (
    id: number,
    company: Omit<Company, "id">
): Promise<Company> => {
    const query = `
    UPDATE companies
    SET
      name = $1,
      email = $2,
      phone = $3,
      iban = $4,
      street = $5,
      postal_code = $6,
      city = $7,
      country = $8,
      logo = $9
    WHERE id = $10
    RETURNING *;
  `;
    const values = [
      company.name,
      company.email,
      company.phone,
      company.iban,
      company.street,
      company.postal_code,
      company.city,
      company.country,
      company.logo,
      id
    ];
    const result = await pool.query(query, values);
    return result.rows[0] ?? null;
};

export const updateCompanyLogoInDB = async (id: number, logo: string) => {
    const result = await pool.query(
        "UPDATE companies SET logo = $1 WHERE id = $2 RETURNING *",
        [logo, id]
    );
    return result.rows[0] ?? null;
};
