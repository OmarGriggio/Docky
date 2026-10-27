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
    const company = await createCompanyInDB(companyData);
    await createPlaceholderClientInDB(company.id);
    return company;
  });
};

// The early payment discount is printed and computed on every invoice
// created afterwards - a rate over 100 or a negative minimum would print a
// nonsensical amount. Without a rate there's nothing to offer, so the days
// are cleared rather than kept around unused.
const normalizeEarlyPayment = (companyData: Omit<Company, "id">): Omit<Company, "id"> => {
  const discount = Number(companyData.early_payment_discount ?? 0);
  const days = companyData.early_payment_days ?? null;
  const minAmount = Number(companyData.early_payment_min_amount ?? 0);

  if (!(discount >= 0 && discount <= 100)) {
    throw new AppError("early_payment_discount must be between 0 and 100", 400);
  }
  if (!(minAmount >= 0)) {
    throw new AppError("early_payment_min_amount must be 0 or more", 400);
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
  const company = await updateCompanyInDB(id, normalizeEarlyPayment(companyData));
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
