import { Company } from '../models/company';

// What an invoice's Swiss QR-bill needs from the company's own profile - the
// creditor the backend validates (swiss-qr-bill/validators/creditor.validator.ts):
// a name, an IBAN, an NPA and town, a country. The street is optional there.
// Each missing one is a translation key under `invoicingReadiness.fields.*`.
export type MissingProfileField = 'name' | 'iban' | 'postalCodeCity' | 'country';

const blank = (value: string | null | undefined) => !value?.trim();

export const missingForInvoicing = (company: Company): MissingProfileField[] => {
  const missing: MissingProfileField[] = [];
  if (blank(company.name)) {
    missing.push('name');
  }
  if (blank(company.iban)) {
    missing.push('iban');
  }
  if (blank(company.postal_code) || blank(company.city)) {
    missing.push('postalCodeCity');
  }
  if (blank(company.country)) {
    missing.push('country');
  }
  return missing;
};
