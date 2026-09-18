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
}
