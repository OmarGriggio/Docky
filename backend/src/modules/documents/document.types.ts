// PROJECT is a chantier itself - see projects/project.types.ts. Its own
// document_sections/document_lines are that chantier's resource ledger.
export type DocumentType = "QUOTE" | "INVOICE" | "PROJECT";

export type DocumentStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "PAID" | "CANCELLED";

export interface Document {
  id: number;

  company_id: number;
  client_id: number;
  // Which of the client's own addresses this document is addressed to -
  // null falls back to the client's primary address.
  address_id: number | null;
  // The client's own reference/PO number, if they gave one - free text,
  // printed on the document when set.
  reference_client: string | null;
  // What this document was derived from, if anything: a PROJECT's own quote
  // (see document.service.ts's acceptQuoteServ), or an INVOICE's own project
  // (the chantier it bills) - null for a QUOTE, or a project created by hand.
  parent_document_id: number | null;
  type: DocumentType;
  number: string;
  date: Date;
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
// type/number/status/parent_document_id are never editable this way, each
// has its own dedicated flow instead (acceptQuoteServ for status,
// archive/unarchive for is_active).
export type UpdateDocumentData = Pick<
  Document,
  "client_id" | "address_id" | "reference_client" | "date" | "discount" | "vat_rate" | "introduction" | "conclusion" | "payment_terms" | "due_date"
>;
