import { Request, Response } from "express";
import { getLinesForDocumentServ, addLineServ, archiveLineServ, unarchiveLineServ } from "./document_line.service";
import { DocumentLine } from "./document_line.types";

export const getLines = async (req: Request, res: Response) => {
  const document_id = Number(req.query.document_id);
  const includeArchived = req.query.includeArchived === "true";

  const lines = await getLinesForDocumentServ(document_id, req.user.company_id, includeArchived);
  res.json(lines);
};

export const createLine = async (req: Request, res: Response) => {
  const { document_id, ...lineData }: Omit<DocumentLine, "id" | "company_id" | "position" | "is_active"> & { document_id: number } = req.body;

  const lineCreated = await addLineServ(lineData, document_id, req.user.company_id);
  res.json(lineCreated);
};

export const archiveLine = async (req: Request, res: Response) => {
  const lineArchived = await archiveLineServ(Number(req.params.id), req.user.company_id);
  res.json(lineArchived);
};

export const unarchiveLine = async (req: Request, res: Response) => {
  const lineUnarchived = await unarchiveLineServ(Number(req.params.id), req.user.company_id);
  res.json(lineUnarchived);
};
