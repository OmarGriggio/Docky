export interface Address {
  id: number;
  // Client-owned only now (suppliers removed).
  client_id: number;
  is_primary: boolean;
  attention: string | null;
  street: string;
  postal_code: string;
  city: string;
  country: string;
}
