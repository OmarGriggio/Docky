import { pool } from "../../shared/config/database";
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
  const result = await pool.query(query, values);
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
  const result = await pool.query(query, values);
  return result.rows;
};

export const getDocumentByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM documents WHERE id = $1 AND company_id = $2",
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
  const result = await pool.query(
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

  const result = await pool.query(query, [amount_excl_vat, amount_incl_vat, id, company_id]);
  return result.rows[0];
};

export const archiveDocumentInDB = async (id: number, company_id: number): Promise<Document> => {
  const query = `
    UPDATE documents SET is_active = false
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const unarchiveDocumentInDB = async (id: number, company_id: number): Promise<Document> => {
  const query = `
    UPDATE documents SET is_active = true
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const acceptDocumentInDB = async (id: number, company_id: number): Promise<Document> => {
  const query = `
    UPDATE documents SET status = 'ACCEPTED'
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const updateDocumentStatusInDB = async (id: number, company_id: number, status: DocumentStatus): Promise<Document> => {
  const query = `
    UPDATE documents SET status = $1
      WHERE id = $2 AND company_id = $3
    RETURNING *;
  `;

  const result = await pool.query(query, [status, id, company_id]);
  return result.rows[0];
};

export const updateDocumentInDB = async (
  id: number,
  company_id: number,
  data: UpdateDocumentData
): Promise<Document> => {
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
      due_date = $10
      WHERE id = $11 AND company_id = $12
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
    company_id
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
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
      due_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
    document.due_date
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
