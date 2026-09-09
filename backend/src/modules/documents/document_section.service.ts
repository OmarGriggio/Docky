import { DocumentSection } from "./document_section.types";
import {
  getSectionsByDocumentIdFromDB,
  getSectionByIdFromDB,
  getNextPositionForDocumentFromDB,
  createSectionInDB,
  archiveSectionInDB,
  unarchiveSectionInDB
} from "./document_section.repository";
import { getDocumentByIdFromDB } from "./document.repository";
import { NotFoundError } from "../../shared/types/errors";

export const getSectionsForDocumentServ = async (document_id: number, company_id: number, includeArchived = false) => {
  const document = await getDocumentByIdFromDB(document_id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  return await getSectionsByDocumentIdFromDB(document_id, includeArchived);
};

export const addSectionServ = async (
  sectionData: Omit<DocumentSection, "id" | "company_id" | "document_id" | "position" | "is_active">,
  document_id: number,
  company_id: number
) => {
  const document = await getDocumentByIdFromDB(document_id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }

  const position = await getNextPositionForDocumentFromDB(document_id);

  return await createSectionInDB({ ...sectionData, document_id, company_id, position, is_active: true });
};

export const archiveSectionServ = async (id: number, company_id: number) => {
  const section = await getSectionByIdFromDB(id, company_id);
  if (!section) {
    throw new NotFoundError("Section not found");
  }
  return await archiveSectionInDB(id, company_id);
};

export const unarchiveSectionServ = async (id: number, company_id: number) => {
  const section = await getSectionByIdFromDB(id, company_id);
  if (!section) {
    throw new NotFoundError("Section not found");
  }
  return await unarchiveSectionInDB(id, company_id);
};
