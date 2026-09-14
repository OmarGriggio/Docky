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

// client_number is immutable (the client's stable business key, like a
// document's own `number`) and is_active/company_id have their own
// dedicated flows - everything else can be edited this way.
export type UpdateClientData = Pick<
  Client,
  "type" | "company_name" | "vat_number" | "last_name" | "first_name" | "title" | "email" | "phone" | "note"
>;
