import { DocumentLine } from "./document_line.types";
import {
  getLinesByDocumentIdFromDB,
  getLineByIdFromDB,
  getNextPositionForSectionFromDB,
  createLineInDB,
  archiveLineInDB,
  unarchiveLineInDB
} from "./document_line.repository";
import { getDocumentByIdFromDB } from "./document.repository";
import { getSectionByIdFromDB } from "./document_section.repository";
import { recomputeDocumentTotalsServ } from "./document.service";
import { NotFoundError } from "../../shared/types/errors";

export const getLinesForDocumentServ = async (document_id: number, company_id: number, includeArchived = false) => {
  const document = await getDocumentByIdFromDB(document_id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  return await getLinesByDocumentIdFromDB(document_id, includeArchived);
};

export const addLineServ = async (
  lineData: Omit<DocumentLine, "id" | "company_id" | "document_id" | "position" | "is_active">,
  document_id: number,
  company_id: number
) => {
  const document = await getDocumentByIdFromDB(document_id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }

  // The section has to actually belong to this document (and company) -
  // otherwise a line could be attached to another document's section.
  const section = await getSectionByIdFromDB(lineData.section_id, company_id);
  if (!section || section.document_id !== document_id) {
    throw new NotFoundError("Section not found");
  }

  const position = await getNextPositionForSectionFromDB(lineData.section_id);

  const line = await createLineInDB({ ...lineData, document_id, company_id, position, is_active: true });

  await recomputeDocumentTotalsServ(document_id, company_id);

  return line;
};

export const archiveLineServ = async (id: number, company_id: number) => {
  const line = await getLineByIdFromDB(id, company_id);
  if (!line) {
    throw new NotFoundError("Line not found");
  }

  const archived = await archiveLineInDB(id, company_id);
  await recomputeDocumentTotalsServ(line.document_id, company_id);

  return archived;
};

export const unarchiveLineServ = async (id: number, company_id: number) => {
  const line = await getLineByIdFromDB(id, company_id);
  if (!line) {
    throw new NotFoundError("Line not found");
  }

  const unarchived = await unarchiveLineInDB(id, company_id);
  await recomputeDocumentTotalsServ(line.document_id, company_id);

  return unarchived;
};
