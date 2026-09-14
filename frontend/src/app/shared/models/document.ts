// PROJECT is a chantier itself - see shared/models/project.ts. Its own
// document_sections/document_lines are that chantier's resource ledger.
export type DocumentType = 'QUOTE' | 'INVOICE' | 'PROJECT';

export type DocumentStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'PAID' | 'CANCELLED';

export interface Document {
  id: number;
  client_id: number;
  // Which of the client's own addresses this document is addressed to -
  // null falls back to the client's primary address.
  address_id: number | null;
  // The client's own reference/PO number, if they gave one - free text.
  reference_client: string | null;
  // What this document was derived from, if anything: a PROJECT's own quote
  // (see document.service.ts's acceptQuoteServ on the backend), or an
  // INVOICE's own project (the chantier it bills) - null for a QUOTE, or a
  // project created by hand.
  parent_document_id: number | null;
  company_id: number;
  type: DocumentType;
  number: string;
  date: string;
  amount_excl_vat: number;
  amount_incl_vat: number;
  discount: number;
  vat_rate: number;
  // Null for a PROJECT document - its lifecycle lives on projects.status
  // instead (IN_PROGRESS/COMPLETED), not this QUOTE/INVOICE-shaped enum.
  status: DocumentStatus | null;
  introduction: string | null;
  conclusion: string | null;
  payment_terms: string | null;
  due_date: string | null;
  is_active: boolean;
}
