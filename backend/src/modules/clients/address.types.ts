export interface Address {
  id: number;

  company_id: number;
  client_id: number | null;
  supplier_id: number | null;
  is_primary: boolean;

  // Free-text "care of" line (e.g. "A l'attention de M. Dupont"), optional -
  // see zz_migrations/000_base.sql.
  attention: string | null;

  street: string;
  postal_code: string;
  city: string;
  country: string;
}
