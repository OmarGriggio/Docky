import { db } from "../../shared/config/database";
import { Document, UpdateDocumentData, DocumentStatus, BilledAddress, InvoiceKind, DepositDeduction } from "./document.types";

// The look a document is frozen with once sent - layout, font, palette,
// element colors and header image (documents.template_style,
// 026_add_document_template.sql): its template's as it is right now - the
// company's default one for a document without any. Read inside the UPDATE
// freezing it, so it's the template as committed then. `templateId`: an SQL
// expression for the template's id.
const frozenStyleOf = (templateId: string) => `(
  SELECT jsonb_build_object('layout', t.layout, 'font', t.font, 'palette', t.palette,
    'element_colors', t.element_colors, 'show_currency', t.show_currency, 'header_image', t.header_image,
    'payment_terms', t.payment_terms)
  FROM templates t
  WHERE t.company_id = documents.company_id
    AND (t.id = ${templateId} OR (${templateId} IS NULL AND t.is_default AND t.is_active))
  LIMIT 1)`;

// client_id is an optional extra narrowing on top of company_id - used by
// client-detail.ts's own expandable rows (a client's own documents), kept
// as a plain appended condition rather than duplicating this whole function
// per combination.
// An invoice's highest payment reminder sent (invoice_reminders) - null without one, the lists' "Rappel 2" tag.
const REMINDER_LEVEL = "(SELECT MAX(r.level) FROM invoice_reminders r WHERE r.document_id = documents.id AND r.company_id = documents.company_id) AS reminder_level";

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

  const query = `SELECT *, ${REMINDER_LEVEL} FROM documents WHERE ${conditions.join(" AND ")} ORDER BY id DESC`;
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

  const query = `SELECT *, ${REMINDER_LEVEL} FROM documents WHERE ${conditions.join(" AND ")} ORDER BY id DESC`;
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

// Held until the current transaction ends: two documents numbered at the
// same moment for the same company take turns - whatever their type and
// format, one lock per company (formats are the company's own, two of them
// could give out the same number) - so the second one sees the first one's
// number instead of reusing it. Only meaningful inside withTransaction -
// outside one, it's released as soon as it's taken.
export const lockDocumentNumberingInDB = async (company_id: number): Promise<void> => {
  await db().query("SELECT pg_advisory_xact_lock($1, hashtext('document-numbering'))", [company_id]);
};

// The highest sequence already given out with a format (number-format.ts's
// numberPattern - anchored, its one group the sequence), any type, archived
// documents included: a number is never given out twice.
export const getHighestSequenceFromDB = async (company_id: number, pattern: string): Promise<number | null> => {
  const result = await db().query(
    `SELECT max(substring(number from $2)::bigint) AS highest FROM documents
     WHERE company_id = $1 AND number ~ $2`,
    [company_id, pattern]
  );
  const highest = result.rows[0]?.highest;
  return highest === null || highest === undefined ? null : Number(highest);
};

// A number the company already has - another format can happen to give out
// the same one (a sequence alone after a year and a sequence).
export const isDocumentNumberTakenInDB = async (company_id: number, number: string): Promise<boolean> => {
  const result = await db().query("SELECT 1 FROM documents WHERE company_id = $1 AND number = $2", [company_id, number]);
  return (result.rowCount ?? 0) > 0;
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
// `billed_address`: what the quote is frozen with (see billed-address.ts) -
// an address it already has is kept.
export const acceptDocumentInDB = async (id: number, company_id: number, billed_address: BilledAddress | null): Promise<Document | null> => {
  const query = `
    UPDATE documents SET status = 'ACCEPTED', billed_address = COALESCE(billed_address, $3::jsonb),
      template_style = COALESCE(template_style, ${frozenStyleOf("documents.template_id")})
      WHERE id = $1 AND company_id = $2 AND status IN ('DRAFT', 'SENT') AND is_active = true
    RETURNING *;
  `;

  const result = await db().query(query, [id, company_id, billed_address]);
  return result.rows[0] ?? null;
};

// The invoice already billing this chantier (its PROJECT document), if any.
// Only a cancelled one doesn't count - an archived invoice still billed the
// work (archiving is tidying up a list, not undoing an invoice), so it keeps
// the chantier from being invoiced a second time. Its deposit invoices don't
// count either: they come before it (see deposit.ts).
export const getInvoiceForProjectDocumentFromDB = async (project_document_id: number, company_id: number): Promise<Document | null> => {
  const result = await db().query(
    `SELECT * FROM documents
      WHERE parent_document_id = $1 AND company_id = $2 AND type = 'INVOICE'
        AND invoice_kind = 'STANDARD' AND status <> 'CANCELLED'
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
// `billed_address`: what the document is frozen with from now on (see
// billed-address.ts) - null back to DRAFT, an address it already has kept
// otherwise.
// `payment_reference`: an invoice's QR-bill reference, frozen the first time
// it leaves DRAFT and never rewritten (null: none to freeze).
export const updateDocumentStatusInDB = async (
  id: number,
  company_id: number,
  status: DocumentStatus,
  billed_address: BilledAddress | null,
  payment_reference: string | null = null
): Promise<Document | null> => {
  const query = `
    UPDATE documents SET status = $1,
      billed_address = CASE WHEN $5 THEN NULL ELSE COALESCE(billed_address, $4::jsonb) END,
      payment_reference = COALESCE(payment_reference, $6),
      template_style = CASE WHEN $5 THEN NULL ELSE COALESCE(template_style, ${frozenStyleOf("documents.template_id")}) END
      WHERE id = $2 AND company_id = $3 AND status IN ('DRAFT', 'SENT') AND is_active = true
    RETURNING *;
  `;

  const result = await db().query(query, [status, id, company_id, billed_address, status === "DRAFT", payment_reference]);
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
      recipient_city = $17,
      template_id = $18,
      early_payment_discount = $19,
      early_payment_days = $20,
      early_payment_min_amount = $21,
      -- A sent quote (still editable) is frozen with its template afresh -
      -- it may just have been changed. A draft stays unfrozen.
      template_style = CASE WHEN status = 'SENT' THEN ${frozenStyleOf("$18::integer")} ELSE template_style END
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
    data.recipient_city,
    data.template_id,
    data.early_payment_discount,
    data.early_payment_days,
    data.early_payment_min_amount
  ];

  const result = await db().query(query, values);
  return result.rows[0] ?? null;
};

// A new document is never frozen yet (billed_address, see billed-address.ts),
// and an ordinary one unless said otherwise (invoice_kind, see deposit.ts).
// Its look isn't frozen either (template_style) - a chantier's PROJECT
// document has no template at all.
export const createDocumentInDB = async (
  document: Omit<Document, "id" | "billed_address" | "invoice_kind" | "deposit_deductions" | "payment_reference" | "template_style" | "template_id">
    & { invoice_kind?: InvoiceKind; template_id?: number | null }
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
      recipient_city,
      early_payment_discount,
      early_payment_days,
      early_payment_min_amount,
      invoice_kind,
      template_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
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
    document.recipient_city,
    document.early_payment_discount,
    document.early_payment_days,
    document.early_payment_min_amount,
    document.invoice_kind ?? "STANDARD",
    document.template_id ?? null
  ];

  const result = await db().query(query, values);
  return result.rows[0];
};

// A sent quote is still editable (see document.service.ts's
// isOpenForEditing) - an edit freezes its address afresh, its client or
// Lieu/Bâtiment may just have changed. Only while it's still that sent
// quote: a concurrent accept or switch back to DRAFT wins.
export const updateBilledAddressInDB = async (id: number, company_id: number, billed_address: BilledAddress | null): Promise<void> => {
  await db().query(
    "UPDATE documents SET billed_address = $1::jsonb WHERE id = $2 AND company_id = $3 AND type = 'QUOTE' AND status = 'SENT'",
    [billed_address, id, company_id]
  );
};

// A chantier's deposit invoices (its PROJECT document's), archived ones
// included - archiving tidies a list, it doesn't undo an invoice - oldest first.
export const getDepositInvoicesFromDB = async (project_document_id: number, company_id: number): Promise<Document[]> => {
  const result = await db().query(
    `SELECT * FROM documents
      WHERE parent_document_id = $1 AND company_id = $2 AND type = 'INVOICE' AND invoice_kind = 'DEPOSIT'
      ORDER BY date, id`,
    [project_document_id, company_id]
  );
  return result.rows;
};

// A final invoice leaving DRAFT keeps the deposits it deducts from then on
// (see deposit.ts) - only the first time.
export const freezeDepositDeductionsInDB = async (id: number, company_id: number, deductions: DepositDeduction[]): Promise<void> => {
  await db().query(
    "UPDATE documents SET deposit_deductions = $1::jsonb WHERE id = $2 AND company_id = $3 AND deposit_deductions IS NULL",
    [JSON.stringify(deductions), id, company_id]
  );
};
