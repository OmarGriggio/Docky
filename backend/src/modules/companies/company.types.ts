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
}
