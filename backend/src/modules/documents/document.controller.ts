import { Request, Response } from "express";
import { addDocumentServ, archiveDocumentServ, unarchiveDocumentServ, getAllDocumentsServ, getDocumentsByTypeServ, getDocumentByIdServ } from "./document.service";
import { Document } from "./document.types";

export const getDocuments = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const id_entreprise = req.user.id_entreprise;
  const includeArchived = req.query.includeArchived === "true";
  const documents = type
    ? await getDocumentsByTypeServ(type, id_entreprise, includeArchived)
    : await getAllDocumentsServ(id_entreprise, includeArchived);
  res.json(documents);
};

export const getDocument = async (req: Request, res: Response) => {
  const document = await getDocumentByIdServ(Number(req.params.id), req.user.id_entreprise);
  res.json(document);
};

export const createDocument = async (req: Request, res: Response) => {
  const documentData: Omit<Document, "id" | "id_entreprise"> = req.body;

  const documentCreated = await addDocumentServ(documentData, req.user.id_entreprise);
  res.json(documentCreated);
};

export const archiveDocument = async (req: Request, res: Response) => {
  const documentArchived = await archiveDocumentServ(Number(req.params.id), req.user.id_entreprise);
  res.json(documentArchived);
};

export const unarchiveDocument = async (req: Request, res: Response) => {
  const documentUnarchived = await unarchiveDocumentServ(Number(req.params.id), req.user.id_entreprise);
  res.json(documentUnarchived);
};
