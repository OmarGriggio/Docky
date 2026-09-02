export interface Address {
  id: number;
  client_id: number | null;
  supplier_id: number | null;
  is_primary: boolean;
  street: string;
  postal_code: string;
  city: string;
  country: string;
}
