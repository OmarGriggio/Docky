import { describe, expect, it } from 'vitest';
import { Company } from '../models/company';
import { missingForInvoicing } from './invoicing-readiness';

const company = (fields: Partial<Company> = {}): Company => ({
  id: 1, name: 'Dupont SA', email: null, phone: null, iban: 'CH93 0076 2011 6238 5295 7',
  street: null, postal_code: '1950', city: 'Sion', country: 'Suisse', logo: null, header_image: null,
  vat_rate: 8.1, vat_number: 'CHE-123.456.789 TVA', payment_terms: null, website: null, bank_name: null, bank_account: null,
  early_payment_discount: 0, early_payment_days: null, early_payment_min_amount: 0,
  accent_color: null, secondary_color: null,
  ...fields,
});

describe('missingForInvoicing', () => {
  it('is empty once the QR-bill has all it needs - no street required', () => {
    expect(missingForInvoicing(company())).toEqual([]);
  });

  it('lists every missing field, blank text counting as missing', () => {
    expect(missingForInvoicing(company({ iban: '  ', postal_code: null, country: '' }))).toEqual(['iban', 'postalCodeCity', 'country']);
  });

  it('needs the VAT number when VAT is charged, not otherwise', () => {
    expect(missingForInvoicing(company({ vat_number: ' ' }))).toEqual(['vatNumber']);
    expect(missingForInvoicing(company({ vat_rate: 0, vat_number: null }))).toEqual([]);
  });

  it('needs both the NPA and the town', () => {
    expect(missingForInvoicing(company({ city: null }))).toEqual(['postalCodeCity']);
  });
});
