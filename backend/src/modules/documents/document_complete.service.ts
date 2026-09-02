import { DocumentComplete } from "./document_complete.types";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByIdFromDB
} from "./document.repository";
import { getDocumentLinesFromDB, getLinesByDocumentIdFromDB } from "./document_line.repository";
import { NotFoundError } from "../../shared/types/errors";

export const getDocumentCompleteServ = async (id: number, company_id: number): Promise<DocumentComplete> => {
  const document = await getDocumentByIdFromDB(id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }

  const lines = await getLinesByDocumentIdFromDB(id);
  return { ...document, lines };
};

export const getAllDocumentsCompleteServ = async (company_id: number, type?: string): Promise<DocumentComplete[]> => {
  const documents = type
    ? await getDocumentsByTypeFromDB(type, company_id)
    : await getDocumentsFromDB(company_id);
  const lines = await getDocumentLinesFromDB(company_id);

  return documents.map(document => ({
    ...document,
    lines: lines.filter(line => line.document_id === document.id)
  }));
};
