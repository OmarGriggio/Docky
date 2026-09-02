import { Request, Response } from "express";
import { addDocumentServ, archiveDocumentServ, unarchiveDocumentServ, getAllDocumentsServ, getDocumentsByTypeServ, getDocumentByIdServ } from "./document.service";
import { Document } from "./document.types";

export const getDocuments = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const company_id = req.user.company_id;
  const includeArchived = req.query.includeArchived === "true";
  const documents = type
    ? await getDocumentsByTypeServ(type, company_id, includeArchived)
    : await getAllDocumentsServ(company_id, includeArchived);
  res.json(documents);
};

export const getDocument = async (req: Request, res: Response) => {
  const document = await getDocumentByIdServ(Number(req.params.id), req.user.company_id);
  res.json(document);
};

export const createDocument = async (req: Request, res: Response) => {
  const documentData: Omit<Document, "id" | "company_id"> = req.body;

  const documentCreated = await addDocumentServ(documentData, req.user.company_id);
  res.json(documentCreated);
};

export const archiveDocument = async (req: Request, res: Response) => {
  const documentArchived = await archiveDocumentServ(Number(req.params.id), req.user.company_id);
  res.json(documentArchived);
};

export const unarchiveDocument = async (req: Request, res: Response) => {
  const documentUnarchived = await unarchiveDocumentServ(Number(req.params.id), req.user.company_id);
  res.json(documentUnarchived);
};
