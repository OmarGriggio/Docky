import { Company } from '../models/company';

// What invoicing needs from the company's own profile: what its Swiss QR-bill
// needs - the creditor the backend validates (swiss-qr-bill/validators/
// creditor.validator.ts): a name, an IBAN, an NPA and town, a country, the
// street being optional there - and, when it charges VAT, its VAT number (an
// invoice charging VAT must print it). Each missing one is a translation key
// under `invoicingReadiness.fields.*`.
export type MissingProfileField = 'name' | 'iban' | 'postalCodeCity' | 'country' | 'vatNumber';

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
  if (company.vat_rate > 0 && blank(company.vat_number)) {
    missing.push('vatNumber');
  }
  return missing;
};
