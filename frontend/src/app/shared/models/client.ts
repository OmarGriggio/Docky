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
  vat_number: string | null;
  last_name: string | null;
  first_name: string | null;
  title: string | null;
  email: string;
  phone: string | null;
  note: string | null;
  language: ClientLanguage;
  is_active: boolean;
}

export interface ClientWithAddresses extends Client {
  addresses: Address[];
}
