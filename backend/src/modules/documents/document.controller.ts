import { Request, Response } from "express";
import { addDocumentServ, updateDocumentServ, archiveDocumentServ, unarchiveDocumentServ, getAllDocumentsServ, getDocumentsByTypeServ, getDocumentByIdServ, acceptQuoteServ } from "./document.service";
import { CreateDocumentData, UpdateDocumentData } from "./document.types";

export const getDocuments = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const company_id = req.user.company_id;
  const includeArchived = req.query.includeArchived === "true";
  const client_id = req.query.client_id ? Number(req.query.client_id) : undefined;
  const documents = type
    ? await getDocumentsByTypeServ(type, company_id, includeArchived, client_id)
    : await getAllDocumentsServ(company_id, includeArchived, client_id);
  res.json(documents);
};

export const getDocument = async (req: Request, res: Response) => {
  const document = await getDocumentByIdServ(Number(req.params.id), req.user.company_id);
  res.json(document);
};

export const createDocument = async (req: Request, res: Response) => {
  const documentData: CreateDocumentData = req.body;

  const documentCreated = await addDocumentServ(documentData, req.user.company_id);
  res.json(documentCreated);
};

export const updateDocument = async (req: Request, res: Response) => {
  const documentData: UpdateDocumentData = req.body;

  const documentUpdated = await updateDocumentServ(Number(req.params.id), req.user.company_id, documentData);
  res.json(documentUpdated);
};

export const archiveDocument = async (req: Request, res: Response) => {
  const documentArchived = await archiveDocumentServ(Number(req.params.id), req.user.company_id);
  res.json(documentArchived);
};

export const unarchiveDocument = async (req: Request, res: Response) => {
  const documentUnarchived = await unarchiveDocumentServ(Number(req.params.id), req.user.company_id);
  res.json(documentUnarchived);
};

export const acceptQuote = async (req: Request, res: Response) => {
  const documentAccepted = await acceptQuoteServ(Number(req.params.id), req.user.company_id);
  res.json(documentAccepted);
};
