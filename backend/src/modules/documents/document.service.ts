import { CreateDocumentData, UpdateDocumentData, DocumentType, DocumentStatus, Document, DocumentContentSection, DocumentRecipient, DepositDeduction } from "./document.types";
import { Client } from "../clients/client.types";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByIdFromDB,
  getLastDocumentNumberFromDB,
  lockDocumentNumberingInDB,
  createDocumentInDB,
  updateDocumentInDB,
  archiveDocumentInDB,
  unarchiveDocumentInDB,
  updateDocumentTotalsInDB,
  acceptDocumentInDB,
  updateDocumentStatusInDB,
  updateBilledAddressInDB,
  getInvoiceForProjectDocumentFromDB,
  getDepositInvoicesFromDB,
  freezeDepositDeductionsInDB,
  archiveDocumentContentInDB,
  getDocumentByIdForUpdateFromDB
} from "./document.repository";
import { getLinesByDocumentIdFromDB, createLineInDB } from "./document_line.repository";
import { getSectionsByDocumentIdFromDB, createSectionInDB } from "./document_section.repository";
import { getClientByIdFromDB } from "../clients/client.repository";
import { getAddressByIdFromDB, getAddressesByClientIdFromDB } from "../clients/address.repository";
import { buildBilledAddress } from "./billed-address";
import { clientDisplayName } from "../clients/client.display";
import { getProjectByDocumentIdFromDB, createProjectInDB, getProjectByIdFromDB } from "../projects/project.repository";
import { amountDue, BillingSummary, ChantierInvoice, depositAmounts, DepositRequest, depositsToDeduct, summarizeBilling } from "./deposit";
import { getTemplateServ } from "./document_template.service";
import { PDF_LABELS, toPdfLanguage } from "../../pdf/templates/pdf-labels";
import { getResourceByIdFromDB } from "../catalog/resource.repository";
import { getCompanyByIdFromDB } from "../companies/company.repository";
import { AppError, NotFoundError, ConflictError } from "../../shared/types/errors";
import { withTransaction } from "../../shared/config/database";
import { computeDocumentTotals } from "./document.calculations";
import { DocumentLineType } from "./document_line.types";

export const getAllDocumentsServ = async (company_id: number, includeArchived = false, client_id?: number) => {
  return await getDocumentsFromDB(company_id, includeArchived, client_id);
};

export const getDocumentsByTypeServ = async (type: string, company_id: number, includeArchived = false, client_id?: number) => {
  return await getDocumentsByTypeFromDB(type, company_id, includeArchived, client_id);
};

export const getDocumentByIdServ = async (id: number, company_id: number) => {
  const document = await getDocumentByIdFromDB(id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  return document;
};

// "FAC"/"OFF" rather than "INV"/"QUOTE": the document number is printed on
// the PDF and shown to the (French-speaking Swiss) client, same content-stays-
// French reasoning as the seed data and the frontend's UI text - not a code
// naming convention. Matches the format already used in zz_migrations/001_data.sql.
// "CH" (chantier) for PROJECT isn't printed anywhere yet, but still needs a
// value - documents.number is NOT NULL regardless of type.
const DOCUMENT_NUMBER_PREFIXES: Record<DocumentType, string> = {
  QUOTE: "OFF",
  INVOICE: "FAC",
  PROJECT: "CH",
};

const DOCUMENT_NUMBER_SEQUENCE_LENGTH = 4;

// The sequence resets every year (the year is embedded in the number itself)
// and is scoped per company + document type, matching the
// UNIQUE (company_id, number) constraint on the documents table. Exported so
// project.service.ts's addProjectServ can number a hand-created chantier's
// own PROJECT document the same way.
// Always called inside withTransaction, the numbered document inserted in
// that same transaction: the lock keeps a concurrent creation from reading
// the same last number until this one is committed (two at once used to
// both take it, the second insert hitting UNIQUE (company_id, number) - a 500).
export const generateDocumentNumber = async (company_id: number, type: DocumentType): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `${DOCUMENT_NUMBER_PREFIXES[type]}-${year}-`;

  await lockDocumentNumberingInDB(company_id, prefix);
  const lastNumber = await getLastDocumentNumberFromDB(company_id, prefix);
  const lastSequence = lastNumber ? Number(lastNumber.slice(prefix.length)) : 0;
  const nextSequence = String(lastSequence + 1).padStart(DOCUMENT_NUMBER_SEQUENCE_LENGTH, "0");

  return `${prefix}${nextSequence}`;
};

const NO_RECIPIENT: DocumentRecipient = {
  recipient_name: null,
  recipient_complement: null,
  recipient_street: null,
  recipient_postal_code: null,
  recipient_city: null,
};

// Column widths of 008_add_document_recipient_columns.sql - also the QR-bill's
// own limits for a name/address line.
const RECIPIENT_MAX_LENGTHS: Record<keyof DocumentRecipient, number> = {
  recipient_name: 70,
  recipient_complement: 70,
  recipient_street: 70,
  recipient_postal_code: 16,
  recipient_city: 35,
};

// A document made out to the "Non défini" placeholder needs its recipient
// typed by hand - at least a name and a postcode + town (what a letter and
// the QR-bill can't do without). A document for a real client never
// carries one: whatever the body sent is dropped, its client's own address
// is what prints.
const CONTROL_CHARACTERS = /[\x00-\x1F\x7F]/;
const QR_ADDRESS_LINE_MAX = 70;

const resolveRecipient = (client: Client, data: Partial<DocumentRecipient>): DocumentRecipient => {
  if (!client.is_placeholder) {
    return NO_RECIPIENT;
  }
  const recipient = { ...NO_RECIPIENT };
  for (const key of Object.keys(RECIPIENT_MAX_LENGTHS) as (keyof DocumentRecipient)[]) {
    const value = typeof data[key] === "string" ? (data[key] as string).trim() : "";
    if (value.length > RECIPIENT_MAX_LENGTHS[key]) {
      throw new AppError(`${key} can't be longer than ${RECIPIENT_MAX_LENGTHS[key]} characters`, 400);
    }
    // A line break or other control character would shift every field after
    // it in the QR-bill's own line-based payload.
    if (CONTROL_CHARACTERS.test(value)) {
      throw new AppError(`${key} can't contain line breaks or control characters`, 400);
    }
    recipient[key] = value || null;
  }
  if (!recipient.recipient_name || !recipient.recipient_postal_code || !recipient.recipient_city) {
    throw new AppError("A recipient typed by hand needs at least a name, a postcode and a town", 400);
  }
  // The QR-bill folds the complement in front of the street on one 70-character
  // line ("complement, street") - checked now rather than found out when the
  // invoice's PDF fails, possibly once it's already sent and frozen.
  const qrAddressLine = [recipient.recipient_complement, recipient.recipient_street].filter(Boolean).join(", ");
  if (qrAddressLine.length > QR_ADDRESS_LINE_MAX) {
    throw new AppError(`The complement and the street together can't be longer than ${QR_ADDRESS_LINE_MAX - 2} characters`, 400, "RECIPIENT_ADDRESS_TOO_LONG");
  }
  return recipient;
};

// documents.address_id (the "Lieu/Bâtiment") has to be one of this same
// client's own addresses - not another client's, nor another company's.
const assertClientAddress = async (address_id: number | null | undefined, client_id: number, company_id: number) => {
  if (address_id == null) {
    return;
  }
  const address = await getAddressByIdFromDB(address_id, company_id);
  if (!address || address.client_id !== client_id) {
    throw new NotFoundError("Address not found");
  }
};

// Both are percentages - anything outside 0-100 would make a total negative
// or nonsensical, whatever the frontend's own inputs allow.
const assertValidRates = (discount: number, vat_rate: number) => {
  if (!(discount >= 0 && discount <= 100)) {
    throw new AppError("discount must be between 0 and 100", 400);
  }
  if (!(vat_rate >= 0 && vat_rate <= 100)) {
    throw new AppError("vat_rate must be between 0 and 100", 400);
  }
};

export const addDocumentServ = async (documentData: CreateDocumentData, company_id: number) => {
  // A PROJECT document is always created together with its projects row, in
  // one go - see project.service.ts's addProjectServ (a chantier created by
  // hand) and acceptQuoteServ below (one spawned from an accepted quote).
  // POST /document never creates one on its own.
  if (documentData.type === "PROJECT") {
    throw new ConflictError("A PROJECT document can't be created directly - create a project instead");
  }

  assertValidRates(documentData.discount, documentData.vat_rate);

  const client = await getClientByIdFromDB(documentData.client_id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }
  await assertClientAddress(documentData.address_id, client.id, company_id);
  const recipient = resolveRecipient(client, documentData);

  // A quote is where the need gets defined - it never derives from anything.
  // Only an INVOICE can point at the PROJECT document it bills, via
  // parent_document_id (see document.types.ts) - ignore any client-supplied
  // value for a QUOTE, same as `number` is always server-generated.
  const parent_document_id = documentData.type === "QUOTE" ? null : documentData.parent_document_id;

  return await withTransaction(async () => {
    // First, so the checks below run under the numbering lock: two invoices
    // for the same chantier created at once take turns, and the second one
    // sees the first.
    const number = await generateDocumentNumber(company_id, documentData.type);

    if (parent_document_id !== null) {
      const projectDocument = await getDocumentByIdFromDB(parent_document_id, company_id);
      if (!projectDocument || projectDocument.type !== "PROJECT") {
        throw new NotFoundError("Project not found");
      }
      const project = await getProjectByDocumentIdFromDB(projectDocument.id, company_id);
      // The real, final quantities aren't settled until the project is closed
      // - invoicing from an in-progress one would bill a moving target.
      if (!project || project.status !== "COMPLETED") {
        throw new ConflictError("Project must be completed before it can be invoiced");
      }
      // One chantier, one invoice - unless the earlier one was cancelled, in
      // which case it gets billed again (an archived one still counts).
      if (await getInvoiceForProjectDocumentFromDB(projectDocument.id, company_id)) {
        throw new ConflictError("This project has already been invoiced");
      }
      // It deducts the chantier's deposits sent or paid: one still a draft
      // must be sent or cancelled first, or it would be left out unseen.
      // An archived draft was never the client's - it doesn't hold anything up.
      const deposits = await getDepositInvoicesFromDB(projectDocument.id, company_id);
      if (deposits.some(deposit => deposit.status === "DRAFT" && deposit.is_active)) {
        throw new ConflictError("A deposit invoice of this chantier is still a draft", "DEPOSIT_DRAFT_PENDING");
      }
    }

    // An invoice offers the company's current early payment discount, copied
    // here and frozen on it (see document.types.ts) - never taken from the
    // request body. A quote doesn't offer one: there's nothing to pay yet.
    const company = documentData.type === "INVOICE" ? await getCompanyByIdFromDB(company_id) : null;
    const earlyPayment = {
      early_payment_discount: company?.early_payment_discount ?? 0,
      early_payment_days: company?.early_payment_days ?? null,
      early_payment_min_amount: company?.early_payment_min_amount ?? 0,
    };

    // amount_excl_vat/amount_incl_vat are always computed from the document's
    // lines (see recomputeDocumentTotalsServ) — a freshly created document has
    // none yet, so it always starts at 0, whatever the request body sent for
    // those fields. Same for status and is_active: every document starts as an
    // active draft, a status only changes through its own flows afterwards
    // (updateDocumentStatusServ, acceptQuoteServ).
    return await createDocumentInDB({
      ...documentData,
      ...recipient,
      ...earlyPayment,
      parent_document_id,
      company_id,
      number,
      // Whatever the body says: a deposit only ever comes from its own flow
      // (addDepositInvoiceServ).
      invoice_kind: "STANDARD",
      status: "DRAFT",
      is_active: true,
      amount_excl_vat: 0,
      amount_incl_vat: 0,
    });
  });
};

// The client's name and address as they are right now, for a document
// leaving DRAFT (see billed-address.ts).
const currentBilledAddress = async (document: Pick<Document, "client_id" | "address_id">, company_id: number) => {
  const client = await getClientByIdFromDB(document.client_id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }
  const addresses = await getAddressesByClientIdFromDB(client.id);
  return buildBilledAddress({ ...client, addresses }, document);
};

// Whether a quote/invoice's header, sections and lines can still change:
// - a quote while the client hasn't answered yet (DRAFT or SENT) - once
//   ACCEPTED it's the frozen record a chantier was born from (see
//   zz_docs/Project Definition.md's lifecycle), once REJECTED it's over;
// - an invoice only while it's a DRAFT. Once SENT, the client holds it under
//   its number - it isn't rewritten afterwards (Swiss bookkeeping, art. 957a
//   CO); a wrong one is CANCELLED and duplicated into a new invoice instead.
// A PROJECT document's status is always null (its lifecycle lives on
// projects.status instead), so it's never editable through this generic
// flow either - see assertContentEditableServ for its own rule.
const isOpenForEditing = (document: Pick<Document, "type" | "status">): boolean => {
  if (document.type === "INVOICE") {
    return document.status === "DRAFT";
  }
  return document.status === "DRAFT" || document.status === "SENT";
};

export const updateDocumentServ = async (id: number, company_id: number, documentData: UpdateDocumentData) => {
  const document = await getDocumentByIdFromDB(id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  if (!isOpenForEditing(document)) {
    throw new ConflictError("This document can no longer be edited");
  }
  assertValidRates(documentData.discount, documentData.vat_rate);

  const client = await getClientByIdFromDB(documentData.client_id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }
  await assertClientAddress(documentData.address_id, client.id, company_id);
  const recipient = resolveRecipient(client, documentData);

  const updated = await updateDocumentInDB(id, company_id, { ...documentData, ...recipient });
  if (!updated) {
    throw new ConflictError("This document can no longer be edited");
  }
  // A sent quote edited: frozen afresh with what it now says (its client may
  // just have gone from "Non défini" to a real one).
  if (updated.status !== null && updated.status !== "DRAFT") {
    await updateBilledAddressInDB(id, company_id, await currentBilledAddress(updated, company_id));
  }
  // discount/vat_rate may have just changed - the stored totals were
  // computed against the old ones, so the row just written back isn't the
  // final one; recomputeDocumentTotalsServ's own result is.
  return await recomputeDocumentTotalsServ(id, company_id);
};

// Statuses settable straight from the list (see document-list.ts's own
// onStatusEditComplete), per document type and current status. A quote
// toggles DRAFT<->SENT or gets REJECTED by the client (ACCEPTED has its own
// dedicated flow, acceptQuoteServ, since it spawns a chantier). An invoice
// goes forward only: a SENT one can be PAID or CANCELLED but never back to
// DRAFT, which would reopen it for editing (see isOpenForEditing).
// REJECTED/ACCEPTED/PAID/CANCELLED are terminal - nothing is settable from
// them.
const SETTABLE_STATUSES: Record<string, Partial<Record<DocumentStatus, DocumentStatus[]>>> = {
  QUOTE: { DRAFT: ["SENT", "REJECTED"], SENT: ["DRAFT", "REJECTED"] },
  INVOICE: { DRAFT: ["SENT", "PAID", "CANCELLED"], SENT: ["PAID", "CANCELLED"] },
};

// Whether a document's sections/lines can still change: a QUOTE/INVOICE
// while it's open (isOpenForEditing, same rule as updateDocumentServ), a
// PROJECT while its chantier is still in progress - once COMPLETED, its
// ledger is exactly what an invoice gets built from (see
// zz_migrations/000_base.sql's comment on projects.status). The frontend
// locks the same cases, but this is the rule that actually holds.
export const assertContentEditableServ = async (document: Document, company_id: number) => {
  if (document.type === "PROJECT") {
    const project = await getProjectByDocumentIdFromDB(document.id, company_id);
    if (!project || !project.is_active || project.status === "COMPLETED") {
      throw new ConflictError("A completed or archived project's resources can no longer be changed");
    }
    return;
  }
  if (!isOpenForEditing(document)) {
    throw new ConflictError("This document can no longer be edited");
  }
};

// Same rule, from a document id - for a single line/section write (see
// document_line.service.ts, document_section.service.ts).
export const assertContentEditableByIdServ = async (document_id: number, company_id: number) => {
  const document = await getDocumentByIdFromDB(document_id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  await assertContentEditableServ(document, company_id);
};

const LINE_TYPES: DocumentLineType[] = ["MATERIAL", "SERVICE"];
// Generous for a construction quote/invoice - a cap so one request can't
// hold a transaction (and its connection) open for thousands of inserts.
const MAX_CONTENT_LINES = 500;

const isPercentage = (value: unknown) => typeof value === "number" && value >= 0 && value <= 100;

// Replaces a document's whole content (every section and line) in one
// transaction: the current ones are archived, the given ones created fresh,
// totals recomputed once. Either all of it lands or none of it - a dropped
// connection halfway can't leave a document half-emptied, as the previous
// one-request-per-line save from the frontend could.
export const replaceDocumentContentServ = async (id: number, company_id: number, sections: DocumentContentSection[]) => {
  if (!Array.isArray(sections) || sections.some(section => !Array.isArray(section?.lines))) {
    throw new AppError("sections must be an array of sections, each with its own lines array", 400);
  }
  const lines = sections.flatMap(section => section.lines);
  if (lines.length > MAX_CONTENT_LINES) {
    throw new AppError(`A document can have at most ${MAX_CONTENT_LINES} lines`, 400);
  }
  if (sections.some(section => typeof section.title !== "string" || !section.title.trim())) {
    throw new AppError("Each section needs a title", 400);
  }
  // document_lines.type has no CHECK constraint of its own - this is the
  // only place that keeps it to the two kinds the rest of the app knows.
  const invalidLine = lines.find(line =>
    !LINE_TYPES.includes(line.type) ||
    typeof line.label !== "string" || !line.label.trim() ||
    !Number.isFinite(line.quantity) ||
    !Number.isFinite(line.unit_price) ||
    (line.discount != null && !isPercentage(line.discount))
  );
  if (invalidLine) {
    throw new AppError("Each line needs a type (MATERIAL or SERVICE), a label, a quantity, a unit price, and a discount between 0 and 100", 400);
  }

  return await withTransaction(async () => {
    // Locked until this transaction ends: a concurrent save, or a status
    // change (e.g. to PAID) on the same document, waits instead of slipping
    // in between this check and the rewrite below.
    const document = await getDocumentByIdForUpdateFromDB(id, company_id);
    if (!document) {
      throw new NotFoundError("Document not found");
    }
    await assertContentEditableServ(document, company_id);

    // A line may only point at one of this company's own catalog resources.
    const resourceIds = new Set(lines.map(line => line.resource_id).filter((id): id is number => id != null));
    for (const resource_id of resourceIds) {
      if (!(await getResourceByIdFromDB(resource_id, company_id))) {
        throw new NotFoundError("Resource not found");
      }
    }

    await archiveDocumentContentInDB(id, company_id);

    for (const [sectionIndex, section] of sections.entries()) {
      const createdSection = await createSectionInDB({
        company_id,
        document_id: id,
        position: sectionIndex + 1,
        title: section.title,
        description: section.description ?? null,
        date_start: section.date_start ? new Date(section.date_start) : null,
        date_end: section.date_end ? new Date(section.date_end) : null,
        note: section.note ?? null,
        is_active: true,
      });

      for (const [lineIndex, line] of section.lines.entries()) {
        await createLineInDB({
          company_id,
          document_id: id,
          section_id: createdSection.id,
          position: lineIndex + 1,
          type: line.type,
          label: line.label,
          quantity: line.quantity,
          unit: line.unit ?? null,
          unit_price: line.unit_price,
          discount: line.discount ?? 0,
          resource_id: line.resource_id ?? null,
          is_active: true,
        });
      }
    }

    return await recomputeDocumentTotalsServ(id, company_id);
  });
};

export const updateDocumentStatusServ = async (id: number, company_id: number, status: DocumentStatus) => {
  const document = await getDocumentByIdFromDB(id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  // An invoice of a chantier - a deposit, or its final invoice: one at a
  // time per chantier (its PROJECT document locked), so cancelling a deposit
  // and sending the final invoice deducting it never cross, and the final
  // invoice's status and frozen deductions are written together.
  if (document.type === "INVOICE" && document.parent_document_id !== null) {
    return await withTransaction(async () => {
      await getDocumentByIdForUpdateFromDB(document.parent_document_id!, company_id);
      return await changeDocumentStatus(id, company_id, status);
    });
  }
  return await changeDocumentStatus(id, company_id, status);
};

const changeDocumentStatus = async (id: number, company_id: number, status: DocumentStatus) => {
  const document = await getDocumentByIdFromDB(id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  const current: DocumentStatus | null = document.status;
  const settable = current ? SETTABLE_STATUSES[document.type]?.[current] ?? [] : [];
  if (!document.is_active || !settable.includes(status)) {
    throw new ConflictError("This document's status can't be changed this way");
  }

  // A deposit already deducted from its chantier's final invoice, sent: that
  // invoice is the client's - cancel it first.
  if (status === "CANCELLED" && document.invoice_kind === "DEPOSIT" && document.parent_document_id !== null) {
    const final = await getInvoiceForProjectDocumentFromDB(document.parent_document_id, company_id);
    if (final?.deposit_deductions?.some(deduction => deduction.document_id === document.id)) {
      throw new ConflictError("This deposit is deducted from the chantier's final invoice", "DEPOSIT_DEDUCTED");
    }
  }

  // Leaving DRAFT freezes the address it's sent to; back to DRAFT (a quote)
  // follows the client again (see updateDocumentStatusInDB).
  const billedAddress = status === "DRAFT" || document.billed_address ? null : await currentBilledAddress(document, company_id);
  const updated = await updateDocumentStatusInDB(id, company_id, status, billedAddress);
  if (!updated) {
    throw new ConflictError("This document's status can't be changed this way");
  }
  // A chantier's final invoice sent (or paid straight away): the deposits it
  // deducts, as they stand now, are frozen on it. Not one cancelled - it
  // deducts nothing any more.
  if (isFinalInvoice(updated) && updated.deposit_deductions === null && (status === "SENT" || status === "PAID")) {
    const deductions = await liveDepositDeductions(updated, company_id);
    await freezeDepositDeductionsInDB(id, company_id, deductions);
    return { ...updated, deposit_deductions: deductions };
  }
  return updated;
};

// Turns an accepted quote into a chantier: creates a brand new PROJECT
// document (always new, never an existing one - see zz_docs/Decisions.md),
// copies the quote's own sections/resource-backed lines into it 1:1 (that
// document's sections/lines become the project's resource ledger), and a
// projects row on top of it holding the chantier's own identity/lifecycle.
// A hand-typed line (no resource_id) contributes nothing - there's no
// catalog resource to attach it to; a section left with none of those is
// skipped entirely rather than created empty.
//
// All in one transaction, the quote's own status flipped first (see
// acceptDocumentInDB): a failure halfway leaves nothing behind (no orphan
// PROJECT document), and a double click can't create two chantiers.
export const acceptQuoteServ = async (id: number, company_id: number) => {
  return await withTransaction(() => acceptQuoteInTransaction(id, company_id));
};

const acceptQuoteInTransaction = async (id: number, company_id: number) => {
  const quote = await getDocumentByIdFromDB(id, company_id);
  if (!quote) {
    throw new NotFoundError("Document not found");
  }
  if (quote.type !== "QUOTE") {
    throw new ConflictError("Only a quote can be accepted");
  }

  const accepted = await acceptDocumentInDB(id, company_id, quote.billed_address ? null : await currentBilledAddress(quote, company_id));
  if (!accepted) {
    throw new ConflictError("Only an active draft or sent quote can be accepted");
  }

  const client = await getClientByIdFromDB(quote.client_id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }

  const number = await generateDocumentNumber(company_id, "PROJECT");

  const projectDocument = await createDocumentInDB({
    company_id,
    client_id: quote.client_id,
    address_id: quote.address_id,
    reference_client: quote.reference_client,
    // This PROJECT document's own "derived from" - the quote it was
    // accepted from (see document.types.ts's parent_document_id comment).
    parent_document_id: quote.id,
    type: "PROJECT",
    number,
    date: new Date(),
    discount: 0,
    vat_rate: 0,
    status: null,
    introduction: null,
    conclusion: null,
    payment_terms: null,
    due_date: null,
    early_payment_discount: 0,
    early_payment_days: null,
    early_payment_min_amount: 0,
    is_active: true,
    amount_excl_vat: 0,
    amount_incl_vat: 0,
    // A quote made out to a recipient typed by hand keeps that recipient on
    // its chantier (and the invoice built from it) - same "Non défini" client.
    recipient_name: quote.recipient_name,
    recipient_complement: quote.recipient_complement,
    recipient_street: quote.recipient_street,
    recipient_postal_code: quote.recipient_postal_code,
    recipient_city: quote.recipient_city,
  });

  const sections = await getSectionsByDocumentIdFromDB(id);
  const lines = await getLinesByDocumentIdFromDB(id);

  for (const section of sections) {
    const resourceLines = lines.filter(line => line.section_id === section.id && line.resource_id !== null);
    if (resourceLines.length === 0) {
      continue;
    }

    const projectSection = await createSectionInDB({
      company_id,
      document_id: projectDocument.id,
      position: section.position,
      title: section.title,
      description: section.description,
      date_start: null,
      date_end: null,
      note: null,
      is_active: true,
    });

    for (const line of resourceLines) {
      await createLineInDB({
        company_id,
        document_id: projectDocument.id,
        section_id: projectSection.id,
        type: line.type,
        position: line.position,
        label: line.label,
        quantity: line.quantity,
        unit: line.unit,
        unit_price: line.unit_price,
        discount: 0,
        resource_id: line.resource_id,
        is_active: true,
      });
    }
  }

  await recomputeDocumentTotalsServ(projectDocument.id, company_id);

  // The chantier's own address lives on its PROJECT document (address_id,
  // copied from the quote above) now, not duplicated on this row.
  await createProjectInDB({
    company_id,
    document_id: projectDocument.id,
    client_id: quote.client_id,
    // Named after whoever it's for - the typed-in recipient when the client
    // is the "Non défini" placeholder, which alone would say nothing.
    name: (client.is_placeholder && quote.recipient_name) || clientDisplayName(client),
  });

  return accepted;
};

// The actual math lives in document.calculations.ts (computeDocumentTotals) — this
// function's own job is just fetching what that math needs and saving the result.
export const recomputeDocumentTotalsServ = async (document_id: number, company_id: number) => {
  const document = await getDocumentByIdFromDB(document_id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }

  const lines = await getLinesByDocumentIdFromDB(document_id);
  const { amount_excl_vat, amount_incl_vat } = computeDocumentTotals(lines, document.discount, document.vat_rate);

  return await updateDocumentTotalsInDB(document_id, company_id, amount_excl_vat, amount_incl_vat);
};

export const archiveDocumentServ = async (id: number, company_id: number) => {
  const document = await getDocumentByIdFromDB(id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  return await archiveDocumentInDB(id, company_id);
};

export const unarchiveDocumentServ = async (id: number, company_id: number) => {
  const document = await getDocumentByIdFromDB(id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  return await unarchiveDocumentInDB(id, company_id);
};

// A chantier's deposit invoices and where its billing stands - for its page:
// its final invoice once there is one, and the deposits a final invoice would
// deduct now (what a new one's form shows).
export interface ChantierBilling extends BillingSummary {
  quoteNumber: string | null;
  deposits: ChantierInvoice[];
  finalInvoice: ChantierInvoice | null;
  deductible: DepositDeduction[];
}

// The chantier (by its project id, scoped to the company), its PROJECT
// document, and the accepted quote it came from - null for one created by hand.
const chantierDocuments = async (project_id: number, company_id: number) => {
  const project = await getProjectByIdFromDB(project_id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  const projectDocument = await getDocumentByIdFromDB(project.document_id, company_id);
  if (!projectDocument) {
    throw new NotFoundError("Project not found");
  }
  const parent = projectDocument.parent_document_id === null ? null : await getDocumentByIdFromDB(projectDocument.parent_document_id, company_id);
  const quote = parent?.type === "QUOTE" ? parent : null;
  return { project, projectDocument, quote };
};

export const getChantierBillingServ = async (project_id: number, company_id: number): Promise<ChantierBilling> => {
  const { projectDocument, quote } = await chantierDocuments(project_id, company_id);
  const deposits = (await getDepositInvoicesFromDB(projectDocument.id, company_id))
    .map(({ id, number, date, status, amount_incl_vat }) => ({ id, number, date, status, amount_incl_vat }));
  const final = await getInvoiceForProjectDocumentFromDB(projectDocument.id, company_id);
  const finalDue = final ? amountDue(final.amount_incl_vat, await getDepositDeductionsServ(final, company_id)) : 0;
  return {
    ...summarizeBilling(quote?.amount_incl_vat ?? null, deposits, final && { status: final.status, amountDue: finalDue }),
    quoteNumber: quote?.number ?? null,
    deposits,
    finalInvoice: final && { id: final.id, number: final.number, date: final.date, status: final.status, amount_incl_vat: final.amount_incl_vat },
    deductible: depositsToDeduct(deposits),
  };
};

// A deposit invoice on a chantier (deposit.ts): at any time - in progress or
// completed, before its final invoice - a percentage of its accepted quote's
// total incl. VAT, or an amount. A draft like any invoice, numbered with the
// others (FAC-...), to the chantier's client (or typed-in recipient) and
// address, with one line "Acompte n° 2 - 30 % selon offre OFF-..." in the
// client's language, at the company's current VAT rate, the invoice
// template's texts, payment terms and due date -
// and no early payment discount: that's only ever on the final invoice.
export const addDepositInvoiceServ = async (project_id: number, company_id: number, request: DepositRequest) => {
  const { project, projectDocument, quote } = await chantierDocuments(project_id, company_id);
  if (!project.is_active) {
    throw new ConflictError("An archived chantier can't be invoiced");
  }
  const company = await getCompanyByIdFromDB(company_id);
  if (!company) {
    throw new NotFoundError("Company not found");
  }
  // The rate in force now, the deposit being invoiced now - not the quote's,
  // which may be older.
  const vatRate = company.vat_rate;
  const amounts = depositAmounts(request ?? {}, quote?.amount_incl_vat ?? null, vatRate);

  const client = await getClientByIdFromDB(projectDocument.client_id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }
  const language = toPdfLanguage(client.language);
  const labels = PDF_LABELS[language];
  const template = await getTemplateServ("INVOICE", company_id, language);
  const today = new Date();
  const dueDate = template.due_days ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + template.due_days) : null;

  return await withTransaction(async () => {
    const number = await generateDocumentNumber(company_id, "INVOICE");
    // Under the numbering lock, the same one the final invoice is created
    // under: it can't slip in between this check and the insert.
    if (await getInvoiceForProjectDocumentFromDB(projectDocument.id, company_id)) {
      throw new ConflictError("This chantier already has its final invoice");
    }
    // Every deposit counts, a cancelled one too - "Acompte n° 2" is never
    // printed on two different invoices. Two asked at once get n° 2 and n° 3.
    const position = (await getDepositInvoicesFromDB(projectDocument.id, company_id)).length + 1;

    const deposit = await createDocumentInDB({
      company_id,
      client_id: projectDocument.client_id,
      address_id: projectDocument.address_id,
      reference_client: projectDocument.reference_client,
      parent_document_id: projectDocument.id,
      type: "INVOICE",
      invoice_kind: "DEPOSIT",
      number,
      date: today,
      amount_excl_vat: 0,
      amount_incl_vat: 0,
      discount: 0,
      vat_rate: vatRate,
      status: "DRAFT",
      introduction: template.introduction,
      conclusion: template.conclusion,
      payment_terms: company.payment_terms,
      due_date: dueDate,
      recipient_name: projectDocument.recipient_name,
      recipient_complement: projectDocument.recipient_complement,
      recipient_street: projectDocument.recipient_street,
      recipient_postal_code: projectDocument.recipient_postal_code,
      recipient_city: projectDocument.recipient_city,
      early_payment_discount: 0,
      early_payment_days: null,
      early_payment_min_amount: 0,
      is_active: true,
    });

    // The section's title is what page 1 lists ("Pos 1"), its one line the
    // same words - a deposit has no details page (invoice-pdf-generator.ts).
    const label = labels.depositLine(position, amounts.percent, quote?.number ?? null);
    const section = await createSectionInDB({
      company_id, document_id: deposit.id, position: 1, title: label,
      description: null, date_start: null, date_end: null, note: null, is_active: true,
    });
    await createLineInDB({
      company_id, document_id: deposit.id, section_id: section.id, position: 1, type: "SERVICE",
      label,
      quantity: 1, unit: null, unit_price: amounts.exclVat, discount: 0, resource_id: null, is_active: true,
    });
    return await recomputeDocumentTotalsServ(deposit.id, company_id);
  });
};

// A chantier's final invoice: its one STANDARD invoice (see deposit.ts).
const isFinalInvoice = (document: Pick<Document, "type" | "invoice_kind" | "parent_document_id">) =>
  document.type === "INVOICE" && document.invoice_kind === "STANDARD" && document.parent_document_id !== null;

const liveDepositDeductions = async (document: Pick<Document, "parent_document_id">, company_id: number): Promise<DepositDeduction[]> =>
  depositsToDeduct(await getDepositInvoicesFromDB(document.parent_document_id!, company_id));

// The deposits an invoice deducts: frozen once a final invoice was sent,
// worked out from its chantier's deposits while it's a draft, none for any
// other document.
export const getDepositDeductionsServ = async (
  document: Pick<Document, "type" | "invoice_kind" | "parent_document_id" | "deposit_deductions">,
  company_id: number
): Promise<DepositDeduction[]> => {
  if (!isFinalInvoice(document)) {
    return [];
  }
  return document.deposit_deductions ?? await liveDepositDeductions(document, company_id);
};

// GET /document/:id/deductions - what the document form shows under a final
// invoice's totals: the deposits deducted and what's left to pay.
export const getDocumentDeductionsServ = async (id: number, company_id: number) => {
  const document = await getDocumentByIdFromDB(id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  const deductions = await getDepositDeductionsServ(document, company_id);
  return { deductions, amount_due: amountDue(document.amount_incl_vat, deductions) };
};
