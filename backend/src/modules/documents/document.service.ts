import { CreateDocumentData, DocumentType } from "./document.types";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByIdFromDB,
  getLastDocumentNumberFromDB,
  createDocumentInDB,
  archiveDocumentInDB,
  unarchiveDocumentInDB,
  updateDocumentTotalsInDB,
  acceptDocumentInDB
} from "./document.repository";
import { getLinesByDocumentIdFromDB } from "./document_line.repository";
import { getClientByIdFromDB } from "../clients/client.repository";
import { Client } from "../clients/client.types";
import { getProjectByIdFromDB, createProjectInDB } from "../projects/project.repository";
import { createProjectResourceInDB } from "../projects/project_resource.repository";
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
const DOCUMENT_NUMBER_PREFIXES: Record<DocumentType, string> = {
  QUOTE: "OFF",
  INVOICE: "FAC",
};

const DOCUMENT_NUMBER_SEQUENCE_LENGTH = 4;

// The sequence resets every year (the year is embedded in the number itself)
// and is scoped per company + document type, matching the
// UNIQUE (company_id, number) constraint on the documents table.
const generateDocumentNumber = async (company_id: number, type: DocumentType): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `${DOCUMENT_NUMBER_PREFIXES[type]}-${year}-`;

  const lastNumber = await getLastDocumentNumberFromDB(company_id, prefix);
  const lastSequence = lastNumber ? Number(lastNumber.slice(prefix.length)) : 0;
  const nextSequence = String(lastSequence + 1).padStart(DOCUMENT_NUMBER_SEQUENCE_LENGTH, "0");

  return `${prefix}${nextSequence}`;
};

export const addDocumentServ = async (documentData: CreateDocumentData, company_id: number) => {
  const client = await getClientByIdFromDB(documentData.client_id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }

  // A quote is where the need gets defined - it can never target an
  // existing project (a project is born from an accepted quote instead, see
  // acceptQuoteServ below). Ignore any client-supplied project_id for a
  // QUOTE, same as `number` is always server-generated regardless of input.
  const project_id = documentData.type === "QUOTE" ? null : documentData.project_id;

  if (project_id !== null) {
    const project = await getProjectByIdFromDB(project_id, company_id);
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    // The real, final quantities aren't settled until the project is closed
    // - invoicing from an in-progress one would bill a moving target.
    if (project.status !== "COMPLETED") {
      throw new ConflictError("Project must be completed before it can be invoiced");
    }
  }

  const number = await generateDocumentNumber(company_id, documentData.type);

  // amount_excl_vat/amount_incl_vat are always computed from the document's
  // lines (see recomputeDocumentTotalsServ) — a freshly created document has
  // none yet, so it always starts at 0, whatever the request body sent for
  // those fields.
  return await createDocumentInDB({ ...documentData, project_id, company_id, number, amount_excl_vat: 0, amount_incl_vat: 0 });
};

// Turns an accepted quote into a chantier: creates a brand new project
// (always new, never an existing one - see zz_docs/Decisions.md), copies
// the quote's resource-backed lines into it as project_resources (the
// project's starting quantities/prices, adjustable by hand from there on),
// and attaches the quote to that project. A hand-typed line (no resource_id)
// contributes nothing - there's no catalog resource to attach it to.
export const acceptQuoteServ = async (id: number, company_id: number) => {
  const document = await getDocumentByIdFromDB(id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  if (document.type !== "QUOTE") {
    throw new ConflictError("Only a quote can be accepted");
  }
  if (document.status === "ACCEPTED") {
    throw new ConflictError("This quote has already been accepted");
  }

  const client = await getClientByIdFromDB(document.client_id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }

  // Starts as "same address as client", like a manually-created project's
  // own default (project-form.ts) - no street/city of its own yet, editable
  // by hand afterwards from the project list.
  const project = await createProjectInDB({
    company_id,
    client_id: document.client_id,
    name: clientDisplayName(client),
    same_address_as_client: true,
  });

  const lines = await getLinesByDocumentIdFromDB(id);

  // Several lines can reference the same catalog resource (e.g. split
  // across sections) - project_resources has one row per resource
  // (UNIQUE(project_id, resource_id)), so their quantities are summed into
  // it. unit_price just keeps whichever line was seen last - a starting
  // point, not meant to be exact once differently-priced lines collide.
  const totalsByResource = new Map<number, { quantity: number; unit_price: number }>();
  for (const line of lines) {
    if (line.resource_id === null) {
      continue;
    }
    const existing = totalsByResource.get(line.resource_id);
    totalsByResource.set(line.resource_id, {
      quantity: (existing?.quantity ?? 0) + Number(line.quantity),
      unit_price: Number(line.unit_price),
    });
  }

  for (const [resource_id, { quantity, unit_price }] of totalsByResource) {
    await createProjectResourceInDB({ company_id, project_id: project.id, resource_id, quantity, unit_price });
  }

  return await acceptDocumentInDB(id, company_id, project.id);
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
