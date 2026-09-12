export type DocumentType = "QUOTE" | "INVOICE";

export type DocumentStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "PAID" | "CANCELLED";

export interface Document {
  id: number;

  company_id: number;
  client_id: number;
  project_id: number | null;
  parent_document_id: number | null;
  type: DocumentType;
  number: string;
  date: Date;
  amount_excl_vat: number;
  amount_incl_vat: number;
  discount: number;
  vat_rate: number;
  status: DocumentStatus;
  introduction: string | null;
  conclusion: string | null;
  payment_terms: string | null;
  due_date: Date | null;
  is_active: boolean;
}

// What a caller sends to create a document: id/company_id are set by the
// server, number is generated in document.service.ts (see
// generateDocumentNumber), and the amounts are always derived from the
// document's lines (see recomputeDocumentTotalsServ) — never client input.
export type CreateDocumentData = Omit<
  Document,
  "id" | "company_id" | "number" | "amount_excl_vat" | "amount_incl_vat"
>;

// What a caller sends to edit an already-existing document (see
// updateDocumentServ) - deliberately narrower than CreateDocumentData:
// type/number/project_id/status/parent_document_id are never editable this
// way, each has its own dedicated flow instead (acceptQuoteServ for
// project_id+status, archive/unarchive for is_active).
export type UpdateDocumentData = Pick<
  Document,
  "client_id" | "date" | "discount" | "vat_rate" | "introduction" | "conclusion" | "payment_terms" | "due_date"
>;
