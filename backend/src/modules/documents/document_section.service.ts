import { DocumentSection, UpdateDocumentSectionData, UpdateDocumentSectionNoteData } from "./document_section.types";
import {
  getSectionsByDocumentIdFromDB,
  getUnscheduledSectionsFromDB,
  getScheduledSectionsFromDB,
  getSectionByIdFromDB,
  getNextPositionForDocumentFromDB,
  createSectionInDB,
  updateSectionInDB,
  updateSectionNoteInDB,
  archiveSectionInDB,
  unarchiveSectionInDB
} from "./document_section.repository";
import { getDocumentByIdFromDB } from "./document.repository";
import { NotFoundError } from "../../shared/types/errors";
import { assertContentEditableServ } from "./document.service";

// Adding/archiving a section changes the document's content - same rule as
// its lines (see assertContentEditableServ). Scheduling one (dates) or its
// calendar note doesn't: that's planning, not content, so those stay open.
const assertSectionEditable = async (document_id: number, company_id: number) => {
  const document = await getDocumentByIdFromDB(document_id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  await assertContentEditableServ(document, company_id);
};

export const getSectionsForDocumentServ = async (document_id: number, company_id: number, includeArchived = false) => {
  const document = await getDocumentByIdFromDB(document_id, company_id);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  return await getSectionsByDocumentIdFromDB(document_id, includeArchived);
};

export const getUnscheduledSectionsServ = async (company_id: number) => {
  return await getUnscheduledSectionsFromDB(company_id);
};

export const getScheduledSectionsServ = async (company_id: number) => {
  return await getScheduledSectionsFromDB(company_id);
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
  await assertContentEditableServ(document, company_id);

  const position = await getNextPositionForDocumentFromDB(document_id);

  return await createSectionInDB({ ...sectionData, document_id, company_id, position, is_active: true });
};

export const updateSectionServ = async (id: number, company_id: number, data: UpdateDocumentSectionData) => {
  const section = await getSectionByIdFromDB(id, company_id);
  if (!section) {
    throw new NotFoundError("Section not found");
  }
  return await updateSectionInDB(id, company_id, data);
};

export const updateSectionNoteServ = async (id: number, company_id: number, data: UpdateDocumentSectionNoteData) => {
  const section = await getSectionByIdFromDB(id, company_id);
  if (!section) {
    throw new NotFoundError("Section not found");
  }
  return await updateSectionNoteInDB(id, company_id, data);
};

export const archiveSectionServ = async (id: number, company_id: number) => {
  const section = await getSectionByIdFromDB(id, company_id);
  if (!section) {
    throw new NotFoundError("Section not found");
  }
  await assertSectionEditable(section.document_id, company_id);
  return await archiveSectionInDB(id, company_id);
};

export const unarchiveSectionServ = async (id: number, company_id: number) => {
  const section = await getSectionByIdFromDB(id, company_id);
  if (!section) {
    throw new NotFoundError("Section not found");
  }
  await assertSectionEditable(section.document_id, company_id);
  return await unarchiveSectionInDB(id, company_id);
};
