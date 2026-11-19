import { db } from "../../shared/config/database";
import { Company } from "./company.types";

export const getCompaniesFromDB = async () => {
  const result = await db().query("SELECT * FROM companies");
  return result.rows;
};

export const getCompanyByIdFromDB = async (id: number) => {
  const result = await db().query("SELECT * FROM companies where id = $1", [id]);
  return result.rows[0] ?? null;
};

// The columns a request may write - logo never is: a storage key, set only by
// its own upload route with a key it builds (a key sent by hand could point
// at another company's file - a private project attachment embedded in this
// company's PDFs). A new company starts without one. How its documents look
// is its templates' (modules/templates).
const COLUMNS = [
  "name", "email", "phone", "iban", "street", "postal_code", "city", "country", "vat_rate", "vat_number",
  "website", "bank_name", "bank_account", "qr_iban", "payment_reference_type",
] as const;

const valuesOf = (company: Omit<Company, "id">) => [
  company.name, company.email, company.phone, company.iban, company.street, company.postal_code, company.city,
  company.country, company.vat_rate, company.vat_number, company.website ?? null, company.bank_name ?? null,
  company.bank_account ?? null, company.qr_iban ?? null, company.payment_reference_type ?? "SCOR",
];

export const createCompanyInDB = async (company: Omit<Company, "id">): Promise<Company> => {
    const result = await db().query(
      `INSERT INTO companies (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map((_, i) => "$" + (i + 1)).join(", ")}) RETURNING *`,
      valuesOf(company)
    );
    return result.rows[0];
};

export const updateCompanyInDB = async (id: number, company: Omit<Company, "id">): Promise<Company> => {
    const result = await db().query(
      `UPDATE companies SET ${COLUMNS.map((column, i) => column + " = $" + (i + 2)).join(", ")} WHERE id = $1 RETURNING *`,
      [id, ...valuesOf(company)]
    );
    return result.rows[0] ?? null;
};

export const updateCompanyLogoInDB = async (id: number, logo: string | null) => {
    const result = await db().query(
        "UPDATE companies SET logo = $1 WHERE id = $2 RETURNING *",
        [logo, id]
    );
    return result.rows[0] ?? null;
};
