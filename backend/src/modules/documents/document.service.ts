import { CreateDocumentData, DocumentType } from "./document.types";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByIdFromDB,
  getLastDocumentNumberFromDB,
  createDocumentInDB,
  archiveDocumentInDB,
  unarchiveDocumentInDB,
  updateDocumentTotalsInDB
} from "./document.repository";
import { getLinesByDocumentIdFromDB } from "./document_line.repository";
import { getClientByIdFromDB } from "../clients/client.repository";
import { getProjectByIdFromDB } from "../projects/project.repository";
import { NotFoundError } from "../../shared/types/errors";
import { computeDocumentTotals } from "./document.calculations";

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

  if (documentData.project_id !== null) {
    const project = await getProjectByIdFromDB(documentData.project_id, company_id);
    if (!project) {
      throw new NotFoundError("Project not found");
    }
  }

  const number = await generateDocumentNumber(company_id, documentData.type);

  // amount_excl_vat/amount_incl_vat are always computed from the document's
  // lines (see recomputeDocumentTotalsServ) — a freshly created document has
  // none yet, so it always starts at 0, whatever the request body sent for
  // those fields.
  return await createDocumentInDB({ ...documentData, company_id, number, amount_excl_vat: 0, amount_incl_vat: 0 });
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
