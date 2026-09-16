export interface Address {
  id: number;

  company_id: number;
  client_id: number;
  is_primary: boolean;

  // Free-text "care of" line (e.g. "A l'attention de M. Dupont"), optional -
  // see zz_migrations/000_base.sql.
  attention: string | null;

  street: string;
  postal_code: string;
  city: string;
  country: string;
}

// is_primary/client_id each have their own dedicated flow (is_primary via
// the "one primary per client" logic in addAddressServ, client_id never
// changes once created) - everything else can be edited this way (the
// client detail page's own cell-editable addresses table).
export type UpdateAddressData = Pick<Address, "attention" | "street" | "postal_code" | "city" | "country">;
