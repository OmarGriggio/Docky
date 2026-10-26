import { db } from "../../shared/config/database";
import { Document, UpdateDocumentData, DocumentStatus } from "./document.types";

// client_id is an optional extra narrowing on top of company_id - used by
// client-detail.ts's own expandable rows (a client's own documents), kept
// as a plain appended condition rather than duplicating this whole function
// per combination.
export const getDocumentsFromDB = async (company_id: number, includeArchived = false, client_id?: number) => {
  const conditions = ["company_id = $1"];
  const values: number[] = [company_id];

  if (client_id) {
    values.push(client_id);
    conditions.push(`client_id = $${values.length}`);
  }
  if (!includeArchived) {
    conditions.push("is_active = true");
  }

  const query = `SELECT * FROM documents WHERE ${conditions.join(" AND ")} ORDER BY id`;
  const result = await db().query(query, values);
  return result.rows;
};

export const getDocumentsByTypeFromDB = async (type: string, company_id: number, includeArchived = false, client_id?: number) => {
  const conditions = ["type = $1", "company_id = $2"];
  const values: (number | string)[] = [type, company_id];

  if (client_id) {
    values.push(client_id);
    conditions.push(`client_id = $${values.length}`);
  }
  if (!includeArchived) {
    conditions.push("is_active = true");
  }

  const query = `SELECT * FROM documents WHERE ${conditions.join(" AND ")} ORDER BY id`;
  const result = await db().query(query, values);
  return result.rows;
};

export const getDocumentByIdFromDB = async (id: number, company_id: number) => {
  const result = await db().query(
    "SELECT * FROM documents WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

// Same, but locks the row until the current transaction ends (see
// withTransaction) - a concurrent status change or content save on the same
// document waits for this one instead of interleaving with it.
export const getDocumentByIdForUpdateFromDB = async (id: number, company_id: number) => {
  const result = await db().query(
    "SELECT * FROM documents WHERE id = $1 AND company_id = $2 FOR UPDATE",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

// Used by generateDocumentNumber (document.service.ts) to find the next
// sequence number for a given company/type/year. numberPrefix already
// includes the trailing "-" (e.g. "FAC-2026-"), and since the sequence is a
// fixed-width, zero-padded suffix, ORDER BY number DESC correctly returns the
// highest one lexicographically.
export const getLastDocumentNumberFromDB = async (company_id: number, numberPrefix: string): Promise<string | null> => {
  const result = await db().query(
    `SELECT number FROM documents
     WHERE company_id = $1 AND number LIKE $2
     ORDER BY number DESC
     LIMIT 1`,
    [company_id, `${numberPrefix}%`]
  );
  return result.rows[0]?.number ?? null;
};

export const updateDocumentTotalsInDB = async (
  id: number,
  company_id: number,
  amount_excl_vat: number,
  amount_incl_vat: number
): Promise<Document> => {
  const query = `
    UPDATE documents SET amount_excl_vat = $1, amount_incl_vat = $2
      WHERE id = $3 AND company_id = $4
    RETURNING *;
  `;

  const result = await db().query(query, [amount_excl_vat, amount_incl_vat, id, company_id]);
  return result.rows[0];
};

export const archiveDocumentInDB = async (id: number, company_id: number): Promise<Document> => {
  const query = `
    UPDATE documents SET is_active = false
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await db().query(query, [id, company_id]);
  return result.rows[0];
};

export const unarchiveDocumentInDB = async (id: number, company_id: number): Promise<Document> => {
  const query = `
    UPDATE documents SET is_active = true
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await db().query(query, [id, company_id]);
  return result.rows[0];
};

// Only from a still-open quote (DRAFT/SENT, not archived) - null otherwise.
// Checked in the UPDATE itself rather than by a separate read first: inside
// acceptQuoteServ's transaction, a second concurrent accept waits on this
// row's lock, then finds the status already ACCEPTED and matches nothing -
// so one quote can never spawn two chantiers.
export const acceptDocumentInDB = async (id: number, company_id: number): Promise<Document | null> => {
  const query = `
    UPDATE documents SET status = 'ACCEPTED'
      WHERE id = $1 AND company_id = $2 AND status IN ('DRAFT', 'SENT') AND is_active = true
    RETURNING *;
  `;

  const result = await db().query(query, [id, company_id]);
  return result.rows[0] ?? null;
};

// The invoice already billing this chantier (its PROJECT document), if any.
// Only a cancelled one doesn't count - an archived invoice still billed the
// work (archiving is tidying up a list, not undoing an invoice), so it keeps
// the chantier from being invoiced a second time.
export const getInvoiceForProjectDocumentFromDB = async (project_document_id: number, company_id: number): Promise<Document | null> => {
  const result = await db().query(
    `SELECT * FROM documents
      WHERE parent_document_id = $1 AND company_id = $2 AND type = 'INVOICE'
        AND status <> 'CANCELLED'
      LIMIT 1`,
    [project_document_id, company_id]
  );
  return result.rows[0] ?? null;
};

// Archives every active section and line of a document at once (archive
// instead of delete, same as one at a time) - see replaceDocumentContentServ.
export const archiveDocumentContentInDB = async (document_id: number, company_id: number): Promise<void> => {
  await db().query(
    "UPDATE document_lines SET is_active = false WHERE document_id = $1 AND company_id = $2 AND is_active = true",
    [document_id, company_id]
  );
  await db().query(
    "UPDATE document_sections SET is_active = false WHERE document_id = $1 AND company_id = $2 AND is_active = true",
    [document_id, company_id]
  );
};

// Only from a still-open, active document (DRAFT/SENT) - null otherwise.
// Checked in the UPDATE itself for the same reason as acceptDocumentInDB: a
// REJECTED racing an accept on the same quote waits for it, then matches
// nothing instead of overwriting ACCEPTED.
export const updateDocumentStatusInDB = async (id: number, company_id: number, status: DocumentStatus): Promise<Document | null> => {
  const query = `
    UPDATE documents SET status = $1
      WHERE id = $2 AND company_id = $3 AND status IN ('DRAFT', 'SENT') AND is_active = true
    RETURNING *;
  `;

  const result = await db().query(query, [status, id, company_id]);
  return result.rows[0] ?? null;
};

// Only while the document is still open for editing (a DRAFT, or a SENT
// quote - document.service.ts's isOpenForEditing), checked in the UPDATE
// itself: an edit racing a switch to SENT then matches nothing (null)
// instead of rewriting an invoice that's just been sent.
export const updateDocumentInDB = async (
  id: number,
  company_id: number,
  data: UpdateDocumentData
): Promise<Document | null> => {
  const query = `
    UPDATE documents SET
      client_id = $1,
      address_id = $2,
      reference_client = $3,
      date = $4,
      discount = $5,
      vat_rate = $6,
      introduction = $7,
      conclusion = $8,
      payment_terms = $9,
      due_date = $10,
      recipient_name = $13,
      recipient_complement = $14,
      recipient_street = $15,
      recipient_postal_code = $16,
      recipient_city = $17
      WHERE id = $11 AND company_id = $12
        AND (status = 'DRAFT' OR (type = 'QUOTE' AND status = 'SENT'))
    RETURNING *;
  `;

  const values = [
    data.client_id,
    data.address_id,
    data.reference_client,
    data.date,
    data.discount,
    data.vat_rate,
    data.introduction,
    data.conclusion,
    data.payment_terms,
    data.due_date,
    id,
    company_id,
    data.recipient_name,
    data.recipient_complement,
    data.recipient_street,
    data.recipient_postal_code,
    data.recipient_city
  ];

  const result = await db().query(query, values);
  return result.rows[0] ?? null;
};

export const createDocumentInDB = async (
  document: Omit<Document, "id">
): Promise<Document> => {
  const query = `
    INSERT INTO documents (
      company_id,
      client_id,
      address_id,
      reference_client,
      parent_document_id,
      type,
      number,
      date,
      amount_excl_vat,
      amount_incl_vat,
      discount,
      vat_rate,
      status,
      introduction,
      conclusion,
      payment_terms,
      due_date,
      recipient_name,
      recipient_complement,
      recipient_street,
      recipient_postal_code,
      recipient_city
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING *;
  `;

  const values = [
    document.company_id,
    document.client_id,
    document.address_id,
    document.reference_client,
    document.parent_document_id,
    document.type,
    document.number,
    document.date,
    document.amount_excl_vat,
    document.amount_incl_vat,
    document.discount,
    document.vat_rate,
    document.status,
    document.introduction,
    document.conclusion,
    document.payment_terms,
    document.due_date,
    document.recipient_name,
    document.recipient_complement,
    document.recipient_street,
    document.recipient_postal_code,
    document.recipient_city
  ];

  const result = await db().query(query, values);
  return result.rows[0];
};
