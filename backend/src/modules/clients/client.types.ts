import { Address } from "./address.types";

export type ClientType = "INDIVIDUAL" | "PROFESSIONAL";

export interface Client {
  id: number;

  company_id: number;

  client_number: string;
  type: ClientType;
  company_name: string | null;
  vat_number: string | null;
  last_name: string | null;
  first_name: string | null;
  title: string | null;
  email: string;
  phone: string | null;
  note: string | null;
  is_active: boolean;
}

export interface ClientWithAddresses extends Client {
  addresses: Address[];
}
