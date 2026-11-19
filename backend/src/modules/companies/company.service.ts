import { Company } from "./company.types";
import { isQrIban, isValidIban } from "../../pdf/swiss-qr-bill/payment-reference";
import { createCompanyInDB, getCompanyByIdFromDB, getCompaniesFromDB, updateCompanyInDB, updateCompanyLogoInDB } from "./company.repository";
import { AppError, NotFoundError } from "../../shared/types/errors";
import { createPlaceholderClientInDB } from "../clients/client.repository";
import { withTransaction } from "../../shared/config/database";
import { createStarterTemplateServ } from "../templates/template.service";

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
// client.types.ts) and its "Standard" template (modules/templates) - created
// together, so none ever exists without them.
export const addCompanyServ = async (companyData: Omit<Company, "id">) => {
  return await withTransaction(async () => {
    const company = await createCompanyInDB(normalizeCompanyData(companyData));
    await createPlaceholderClientInDB(company.id);
    await createStarterTemplateServ(company.id);
    return company;
  });
};

// Each text column's own VARCHAR length (000_base.sql, 009) - a longer
// value is a clear 400 here rather than Postgres' "value too long" as a 500.
// The postcode and town are held to the QR-bill's own (16 and 35): every
// invoice prints them as its creditor's address.
const MAX_LENGTHS: Partial<Record<keyof Company, number>> = {
  name: 100,
  email: 255,
  phone: 50,
  iban: 22,
  street: 100,
  postal_code: 16,
  city: 35,
  country: 100,
  vat_number: 20,
  website: 255,
  bank_name: 100,
  bank_account: 50,
};

// A QR-IBAN or nothing - stored without spaces, uppercase. An ordinary IBAN
// typed there would make every invoice's QR-bill invalid (a QR reference
// needs a QR-IBAN): a 400.
const normalizeQrIban = (value: unknown): string | null => {
  if (value !== null && value !== undefined && typeof value !== "string") {
    throw new AppError("qr_iban must be a QR-IBAN", 400);
  }
  const iban = value?.replace(/\s+/g, "").toUpperCase() || null;
  if (iban !== null && !(isQrIban(iban) && isValidIban(iban))) {
    throw new AppError("qr_iban must be a valid QR-IBAN (CH or LI, institution id 30000-31999)", 400, "QR_IBAN_INVALID");
  }
  return iban;
};

const normalizeCompanyData = (companyData: Omit<Company, "id">): Omit<Company, "id"> => {
  // A QR-IBAN goes in its own field. In the ordinary one, every invoice sent
  // with a creditor reference or none (paid to that IBAN) would stop being
  // printable - those can only go to an ordinary IBAN.
  if (typeof companyData.iban === "string" && isQrIban(companyData.iban.replace(/\s+/g, "").toUpperCase())) {
    throw new AppError("iban is a QR-IBAN - it goes in qr_iban", 400, "IBAN_IS_QR_IBAN");
  }

  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    const value = companyData[field as keyof Omit<Company, "id">];
    if (typeof value === "string" && value.length > max) {
      throw new AppError(`${field} must be ${max} characters or fewer`, 400);
    }
  }

  return {
    ...companyData,
    qr_iban: normalizeQrIban(companyData.qr_iban),
    // Anything but "NONE" is the default, a creditor reference.
    payment_reference_type: companyData.payment_reference_type === "NONE" ? "NONE" : "SCOR",
  };
};

// A field the request leaves out keeps its current value - only one sent
// (null included) changes. A page still on an older version (cached by the
// PWA right after a release) doesn't know a column added since, and would
// otherwise wipe it (a QR-IBAN) on every save of the profile.
export const updateCompanyServ = async (id: number, companyData: Omit<Company, "id">): Promise<Company> => {
  const current = await getCompanyByIdFromDB(id);
  if (!current) {
    throw new NotFoundError("Company not found");
  }
  const sent = Object.fromEntries(Object.entries(companyData ?? {}).filter(([, value]) => value !== undefined));
  const company = await updateCompanyInDB(id, normalizeCompanyData({ ...current, ...sent }));
  if (!company) {
    throw new NotFoundError("Company not found");
  }
  return company;
};

export const updateCompanyLogoServ = async (id: number, logo: string | null): Promise<Company> => {
  const company = await updateCompanyLogoInDB(id, logo);
  if (!company) {
    throw new NotFoundError("Company not found");
  }
  return company;
};
