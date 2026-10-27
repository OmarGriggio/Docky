import { Company } from "./company.types";
import { createCompanyInDB, getCompanyByIdFromDB, getCompaniesFromDB, updateCompanyInDB, updateCompanyLogoInDB, updateCompanyHeaderImageInDB, updateCompanyPaymentTermsInDB } from "./company.repository";
import { AppError, NotFoundError } from "../../shared/types/errors";
import { createPlaceholderClientInDB } from "../clients/client.repository";
import { withTransaction } from "../../shared/config/database";

export const getAllCompaniesServ = async () => {
  return await getCompaniesFromDB();
};

export const getCompanyByIdServ = async (id: number): Promise<Company> => {
  const company = await getCompanyByIdFromDB(id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }
  return company;
};

// Every company starts with its "Non défini" placeholder client (see
// client.types.ts) - created together, so none ever exists without one.
export const addCompanyServ = async (companyData: Omit<Company, "id">) => {
  return await withTransaction(async () => {
    const company = await createCompanyInDB(normalizeCompanyData(companyData));
    await createPlaceholderClientInDB(company.id);
    return company;
  });
};

// Each text column's own VARCHAR length (000_base.sql, 009) - a longer
// value is a clear 400 here rather than Postgres' "value too long" as a 500.
const MAX_LENGTHS: Partial<Record<keyof Company, number>> = {
  name: 100,
  email: 255,
  phone: 50,
  iban: 22,
  street: 100,
  postal_code: 20,
  city: 100,
  country: 100,
  vat_number: 20,
  website: 255,
  bank_name: 100,
  bank_account: 50,
};

// NUMERIC(12,2)'s own ceiling.
const MAX_AMOUNT = 9999999999.99;

// Checked on creation and on every edit. The early payment discount is
// printed and computed on every invoice created afterwards - a rate over
// 100 or a negative minimum would print a nonsensical amount. Without a
// rate there's nothing to offer, so the days are cleared rather than kept
// around unused.
const normalizeCompanyData = (companyData: Omit<Company, "id">): Omit<Company, "id"> => {
  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    const value = companyData[field as keyof Omit<Company, "id">];
    if (typeof value === "string" && value.length > max) {
      throw new AppError(`${field} must be ${max} characters or fewer`, 400);
    }
  }

  const discount = Number(companyData.early_payment_discount ?? 0);
  const days = companyData.early_payment_days ?? null;
  const minAmount = Number(companyData.early_payment_min_amount ?? 0);

  if (!(discount >= 0 && discount <= 100)) {
    throw new AppError("early_payment_discount must be between 0 and 100", 400);
  }
  if (!(minAmount >= 0 && minAmount <= MAX_AMOUNT)) {
    throw new AppError("early_payment_min_amount must be between 0 and 9999999999.99", 400);
  }
  if (discount > 0 && !(Number.isInteger(days) && days! >= 1 && days! <= 365)) {
    throw new AppError("early_payment_days must be a whole number of days between 1 and 365", 400);
  }

  return {
    ...companyData,
    early_payment_discount: discount,
    early_payment_days: discount > 0 ? days : null,
    early_payment_min_amount: minAmount,
  };
};

export const updateCompanyServ = async (id: number, companyData: Omit<Company, "id">): Promise<Company> => {
  const company = await updateCompanyInDB(id, normalizeCompanyData(companyData));
  if (!company) {
    throw new NotFoundError("Company not found");
  }
  return company;
};

export const updateCompanyLogoServ = async (id: number, logo: string): Promise<Company> => {
  const company = await updateCompanyLogoInDB(id, logo);
  if (!company) {
    throw new NotFoundError("Company not found");
  }
  return company;
};

export const updateCompanyHeaderImageServ = async (id: number, headerImage: string): Promise<Company> => {
  const company = await updateCompanyHeaderImageInDB(id, headerImage);
  if (!company) {
    throw new NotFoundError("Company not found");
  }
  return company;
};

export const updateCompanyPaymentTermsServ = async (id: number, paymentTerms: string | null): Promise<Company> => {
  const company = await updateCompanyPaymentTermsInDB(id, paymentTerms);
  if (!company) {
    throw new NotFoundError("Company not found");
  }
  return company;
};
