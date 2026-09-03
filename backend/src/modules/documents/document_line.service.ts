import { DocumentLine } from "./document_line.types";
import {
  getLinesByDocumentIdFromDB,
  getLineByIdFromDB,
  getNextPositionForDocumentFromDB,
  createLineInDB,
  archiveLineInDB,
  unarchiveLineInDB
} from "./document_line.repository";
import { getDocumentByIdFromDB } from "./document.repository";
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

  const position = await getNextPositionForDocumentFromDB(document_id);

  // SECTION/NOTE lines are presentation-only - force quantity/unit_price to
  // null regardless of what the request sent, same spirit as amounts being
  // forced to 0 on document creation: the server, not the caller, decides
  // what a structural line is worth (nothing).
  const isPricedLine = lineData.type === "MATERIAL" || lineData.type === "SERVICE";
  const normalizedLineData = isPricedLine
    ? lineData
    : { ...lineData, quantity: null, unit_price: null };

  const line = await createLineInDB({ ...normalizedLineData, document_id, company_id, position, is_active: true });

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
