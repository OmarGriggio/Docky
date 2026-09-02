import { Document } from "./document.types";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByIdFromDB,
  getDocumentByNumberFromDB,
  createDocumentInDB,
  archiveDocumentInDB,
  unarchiveDocumentInDB,
  updateDocumentTotalsInDB
} from "./document.repository";
import { getLinesByDocumentIdFromDB } from "./document_line.repository";
import { getClientByIdFromDB } from "../clients/client.repository";
import { getProjectByIdFromDB } from "../projects/project.repository";
import { NotFoundError, ConflictError } from "../../shared/types/errors";
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

export const addDocumentServ = async (documentData: Omit<Document, "id" | "company_id">, company_id: number) => {
  const existingDocument = await getDocumentByNumberFromDB(documentData.number);
  if (existingDocument) {
    throw new ConflictError("Document number already exists");
  }

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

  // amount_excl_vat/amount_incl_vat are always computed from the document's lines (see
  // recomputeDocumentTotalsServ) — a freshly created document has none yet, so it
  // always starts at 0, whatever the request body sent for those fields.
  return await createDocumentInDB({ ...documentData, company_id, amount_excl_vat: 0, amount_incl_vat: 0 });
};

// The actual math lives in document.calculations.ts (computeDocumentTotals) — this
// function's own job is just fetching what that math needs and saving the result.
export const recomputeDocumentTotalsServ = async (document_id: number, company_id: number) => {
  const document = await getDocumentByIdFromDB(document_id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }

  const lines = await getLinesByDocumentIdFromDB(document_id);
  const { amount_excl_vat, amount_incl_vat } = computeDocumentTotals(lines, document.discount);

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
