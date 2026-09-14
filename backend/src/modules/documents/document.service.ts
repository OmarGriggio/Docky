import { CreateDocumentData, UpdateDocumentData, DocumentType, DocumentStatus } from "./document.types";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByIdFromDB,
  getLastDocumentNumberFromDB,
  createDocumentInDB,
  updateDocumentInDB,
  archiveDocumentInDB,
  unarchiveDocumentInDB,
  updateDocumentTotalsInDB,
  acceptDocumentInDB
} from "./document.repository";
import { getLinesByDocumentIdFromDB, createLineInDB } from "./document_line.repository";
import { getSectionsByDocumentIdFromDB, createSectionInDB } from "./document_section.repository";
import { getClientByIdFromDB } from "../clients/client.repository";
import { Client } from "../clients/client.types";
import { getProjectByDocumentIdFromDB, createProjectInDB } from "../projects/project.repository";
import { NotFoundError, ConflictError } from "../../shared/types/errors";
import { computeDocumentTotals } from "./document.calculations";

// Same rule as the frontend's clientDisplayName (shared/utils/display.ts) -
// duplicated rather than shared across front/back (different languages,
// no shared package between them).
const clientDisplayName = (client: Client): string => {
  return client.company_name || `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
};

export const getAllDocumentsServ = async (company_id: number, includeArchived = false) => {
  return await getDocumentsFromDB(company_id, includeArchived);
};

export const getDocumentsByTypeServ = async (type: string, company_id: number, includeArchived = false) => {
  return await getDocumentsByTypeFromDB(type, company_id, includeArchived);
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
export const generateDocumentNumber = async (company_id: number, type: DocumentType): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `${DOCUMENT_NUMBER_PREFIXES[type]}-${year}-`;

  const lastNumber = await getLastDocumentNumberFromDB(company_id, prefix);
  const lastSequence = lastNumber ? Number(lastNumber.slice(prefix.length)) : 0;
  const nextSequence = String(lastSequence + 1).padStart(DOCUMENT_NUMBER_SEQUENCE_LENGTH, "0");

  return `${prefix}${nextSequence}`;
};

export const addDocumentServ = async (documentData: CreateDocumentData, company_id: number) => {
  // A PROJECT document is always created together with its projects row, in
  // one go - see project.service.ts's addProjectServ (a chantier created by
  // hand) and acceptQuoteServ below (one spawned from an accepted quote).
  // POST /document never creates one on its own.
  if (documentData.type === "PROJECT") {
    throw new ConflictError("A PROJECT document can't be created directly - create a project instead");
  }

  const client = await getClientByIdFromDB(documentData.client_id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }

  // A quote is where the need gets defined - it never derives from anything.
  // Only an INVOICE can point at the PROJECT document it bills, via
  // parent_document_id (see document.types.ts) - ignore any client-supplied
  // value for a QUOTE, same as `number` is always server-generated.
  const parent_document_id = documentData.type === "QUOTE" ? null : documentData.parent_document_id;

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
  }

  const number = await generateDocumentNumber(company_id, documentData.type);

  // amount_excl_vat/amount_incl_vat are always computed from the document's
  // lines (see recomputeDocumentTotalsServ) — a freshly created document has
  // none yet, so it always starts at 0, whatever the request body sent for
  // those fields.
  return await createDocumentInDB({ ...documentData, parent_document_id, company_id, number, amount_excl_vat: 0, amount_incl_vat: 0 });
};

// Editable while the client hasn't answered yet (or before it's even been
// sent) - once a quote is ACCEPTED it's the frozen record a chantier was
// born from (see zz_docs/Project Definition.md's lifecycle), and once
// REJECTED/an invoice is PAID/CANCELLED there's nothing left to correct. A
// PROJECT document's status is always null (its lifecycle lives on
// projects.status instead), so it's never editable through this generic
// flow either.
const EDITABLE_STATUSES: DocumentStatus[] = ["DRAFT", "SENT"];

export const updateDocumentServ = async (id: number, company_id: number, documentData: UpdateDocumentData) => {
  const document = await getDocumentByIdFromDB(id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  if (document.status === null || !EDITABLE_STATUSES.includes(document.status)) {
    throw new ConflictError("This document can no longer be edited");
  }

  const client = await getClientByIdFromDB(documentData.client_id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }

  await updateDocumentInDB(id, company_id, documentData);
  // discount/vat_rate may have just changed - the stored totals were
  // computed against the old ones, so the row just written back isn't the
  // final one; recomputeDocumentTotalsServ's own result is.
  return await recomputeDocumentTotalsServ(id, company_id);
};

// Turns an accepted quote into a chantier: creates a brand new PROJECT
// document (always new, never an existing one - see zz_docs/Decisions.md),
// copies the quote's own sections/resource-backed lines into it 1:1 (that
// document's sections/lines become the project's resource ledger), and a
// projects row on top of it holding the chantier's own identity/lifecycle.
// A hand-typed line (no resource_id) contributes nothing - there's no
// catalog resource to attach it to; a section left with none of those is
// skipped entirely rather than created empty.
export const acceptQuoteServ = async (id: number, company_id: number) => {
  const quote = await getDocumentByIdFromDB(id, company_id);
  if (!quote) {
    throw new NotFoundError("Document not found");
  }
  if (quote.type !== "QUOTE") {
    throw new ConflictError("Only a quote can be accepted");
  }
  if (quote.status === "ACCEPTED") {
    throw new ConflictError("This quote has already been accepted");
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
    is_active: true,
    amount_excl_vat: 0,
    amount_incl_vat: 0,
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

  // Starts as "same address as client", like a manually-created project's
  // own default (project-form.ts) - no street/city of its own yet, editable
  // by hand afterwards from the project list.
  await createProjectInDB({
    company_id,
    document_id: projectDocument.id,
    client_id: quote.client_id,
    name: clientDisplayName(client),
    same_address_as_client: true,
  });

  return await acceptDocumentInDB(id, company_id);
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
