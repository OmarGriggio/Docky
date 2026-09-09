import { Request, Response } from "express";
import { getSectionsForDocumentServ, addSectionServ, archiveSectionServ, unarchiveSectionServ } from "./document_section.service";
import { DocumentSection } from "./document_section.types";

export const getSections = async (req: Request, res: Response) => {
  const document_id = Number(req.query.document_id);
  const includeArchived = req.query.includeArchived === "true";

  const sections = await getSectionsForDocumentServ(document_id, req.user.company_id, includeArchived);
  res.json(sections);
};

export const createSection = async (req: Request, res: Response) => {
  const { document_id, ...sectionData }: Omit<DocumentSection, "id" | "company_id" | "position" | "is_active"> & { document_id: number } = req.body;

  const sectionCreated = await addSectionServ(sectionData, document_id, req.user.company_id);
  res.json(sectionCreated);
};

export const archiveSection = async (req: Request, res: Response) => {
  const sectionArchived = await archiveSectionServ(Number(req.params.id), req.user.company_id);
  res.json(sectionArchived);
};

export const unarchiveSection = async (req: Request, res: Response) => {
  const sectionUnarchived = await unarchiveSectionServ(Number(req.params.id), req.user.company_id);
  res.json(sectionUnarchived);
};
