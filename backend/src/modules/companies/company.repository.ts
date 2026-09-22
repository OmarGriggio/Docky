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
      name, email, phone, iban, street, postal_code, city, country, logo, header_image, vat_rate, vat_number, payment_terms
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
      company.header_image,
      company.vat_rate,
      company.vat_number,
      company.payment_terms
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
      logo = $9,
      header_image = $10,
      vat_rate = $11,
      vat_number = $12,
      payment_terms = $13
    WHERE id = $14
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
      company.header_image,
      company.vat_rate,
      company.vat_number,
      company.payment_terms,
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

export const updateCompanyHeaderImageInDB = async (id: number, headerImage: string) => {
    const result = await pool.query(
        "UPDATE companies SET header_image = $1 WHERE id = $2 RETURNING *",
        [headerImage, id]
    );
    return result.rows[0] ?? null;
};

// Edited from the "Modèles de documents" card (company-profile.html), same
// save action as document_templates' own introduction/conclusion - its own
// dedicated single-column UPDATE, same pattern as the logo/header image
// above, so the main form's own updateCompanyInDB (full-row PUT) doesn't
// have to be involved just to change this one field.
export const updateCompanyPaymentTermsInDB = async (id: number, paymentTerms: string | null) => {
    const result = await pool.query(
        "UPDATE companies SET payment_terms = $1 WHERE id = $2 RETURNING *",
        [paymentTerms, id]
    );
    return result.rows[0] ?? null;
};
