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
  // Shown at the very top of a generated invoice (see backend/src/pdf) -
  // distinct from the logo, which stays in its own top-right corner slot.
  header_image: string | null;
  // Default VAT rate for a new document (document.types.ts's own vat_rate
  // is the one actually used in calculations/PDFs - this is only its
  // starting value).
  vat_rate: number;
  // The company's own VAT/UID number - null if not VAT-registered.
  vat_number: string | null;
}
