import { Address } from './address';

export type ClientType = 'INDIVIDUAL' | 'PROFESSIONAL';

// The client's own preferred language for correspondence/documents - distinct
// from a user's UI language (auth.service.ts's Language, FR/EN only). See
// zz_migrations/002_add_language_columns.sql.
export type ClientLanguage = 'FR' | 'EN' | 'DE' | 'IT';

export interface Client {
  id: number;
  client_number: string;
  type: ClientType;
  company_name: string | null;
  last_name: string | null;
  first_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  language: ClientLanguage;
  is_active: boolean;
  // The company's one "Non défini" client - what a document made out to a
  // recipient typed by hand points at (see document-form.ts's manual mode).
  // Never listed or picked as a client itself.
  is_placeholder: boolean;
}

export interface ClientWithAddresses extends Client {
  addresses: Address[];
}

// A row of GET /client: the client plus its primary address (or its oldest
// one), every field null when it has none.
export interface ClientListItem extends Client {
  address_id: number | null;
  address_attention: string | null;
  address_street: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_country: string | null;
}
