export type DocumentType = 'QUOTE' | 'INVOICE';

export type DocumentStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'PAID' | 'CANCELLED';

export interface Document {
  id: number;
  client_id: number;
  project_id: number | null;
  parent_document_id: number | null;
  company_id: number;
  type: DocumentType;
  number: string;
  date: string;
  amount_excl_vat: number;
  amount_incl_vat: number;
  discount: number;
  status: DocumentStatus;
  introduction: string | null;
  conclusion: string | null;
  is_active: boolean;
}
