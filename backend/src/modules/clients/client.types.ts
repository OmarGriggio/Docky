import { Address } from "./address.types";

export type ClientType = "INDIVIDUAL" | "PROFESSIONAL";

// The client's preferred language for correspondence/documents (see
// zz_migrations/002_add_language_columns.sql) - distinct from a user's own
// UI language (Transloco, FR/EN only), covers Switzerland's main business
// languages.
export type ClientLanguage = "FR" | "EN" | "DE" | "IT";

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
  language: ClientLanguage;
  is_active: boolean;
  // The company's one "Non défini" client (zz_migrations/007_add_placeholder_client.sql):
  // what a quote/invoice made out to a recipient typed by hand points at.
  // Hidden from the clients list, never editable or archivable.
  is_placeholder: boolean;
}

export interface ClientWithAddresses extends Client {
  addresses: Address[];
}

// client_number is immutable (the client's stable business key, like a
// document's own `number`) and is_active/company_id have their own
// dedicated flows - everything else can be edited this way.
export type UpdateClientData = Pick<
  Client,
  "type" | "company_name" | "vat_number" | "last_name" | "first_name" | "title" | "email" | "phone" | "note" | "language"
>;
