import { Request, Response } from "express";
import { getAllDocumentsCompleteServ, getDocumentCompleteServ } from "./document_complete.service";
import { readableDocumentTypes } from "../permissions/permission.middleware";
import { ForbiddenError } from "../../shared/types/errors";

export const getDocumentsComplete = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  // Only the types this user can read (an employee's permissions).
  const readable = await readableDocumentTypes(req);
  if (type && !readable.includes(type)) {
    throw new ForbiddenError();
  }
  const documents = await getAllDocumentsCompleteServ(req.user.company_id, type);
  res.json(documents.filter(document => readable.includes(document.type)));
};

export const getDocumentComplete = async (req: Request, res: Response) => {
  const document = await getDocumentCompleteServ(Number(req.params.id), req.user.company_id);
  res.json(document);
};
