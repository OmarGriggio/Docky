export interface Company {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  iban: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  logo: string | null;
  header_image: string | null;
  vat_rate: number;
  vat_number: string | null;
  payment_terms: string | null;
  // Printed in an invoice's footer - free text, optional.
  website: string | null;
  bank_name: string | null;
  bank_account: string | null;
  // Default early payment discount ("escompte") copied onto each new
  // invoice: rate% off the total incl. VAT when paid within `days`, from
  // `min_amount` incl. VAT up. 0% = none.
  early_payment_discount: number;
  early_payment_days: number | null;
  early_payment_min_amount: number;
}
