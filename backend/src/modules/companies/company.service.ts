import { Company } from "./company.types";
import { createCompanyInDB, getCompanyByIdFromDB, getCompaniesFromDB, updateCompanyInDB, updateCompanyLogoInDB } from "./company.repository";
import { NotFoundError } from "../../shared/types/errors";

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

export const addCompanyServ = async (companyData: Omit<Company, "id">) => {
  return await createCompanyInDB(companyData);
};

export const updateCompanyServ = async (id: number, companyData: Omit<Company, "id">): Promise<Company> => {
  const company = await updateCompanyInDB(id, companyData);
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
