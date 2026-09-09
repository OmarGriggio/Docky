import { DocumentComplete } from "./document_complete.types";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByIdFromDB
} from "./document.repository";
import { getDocumentLinesFromDB, getLinesByDocumentIdFromDB } from "./document_line.repository";
import { getSectionsByDocumentIdFromDB } from "./document_section.repository";
import { NotFoundError } from "../../shared/types/errors";

export const getDocumentCompleteServ = async (id: number, company_id: number): Promise<DocumentComplete> => {
  const document = await getDocumentByIdFromDB(id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }

  const sections = await getSectionsByDocumentIdFromDB(id);
  const lines = await getLinesByDocumentIdFromDB(id);
  return { ...document, sections, lines };
};

export const getAllDocumentsCompleteServ = async (company_id: number, type?: string): Promise<DocumentComplete[]> => {
  const documents = type
    ? await getDocumentsByTypeFromDB(type, company_id)
    : await getDocumentsFromDB(company_id);
  const lines = await getDocumentLinesFromDB(company_id);

  // Sections are fetched per-document (there's no equivalent "all sections
  // for this company" query yet, unlike lines) - fine for a list endpoint,
  // revisit if this ever needs to scale past a handful of documents at once.
  const documentsWithSections = await Promise.all(
    documents.map(async document => ({
      ...document,
      sections: await getSectionsByDocumentIdFromDB(document.id),
      lines: lines.filter(line => line.document_id === document.id)
    }))
  );

  return documentsWithSections;
};
