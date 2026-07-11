import { Request, Response } from "express";
import { addDocumentServ, getAllDocumentsServ, getDocumentsByTypeServ } from "./document.service";
import { Document } from "./document.types";

export const getDocuments = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const documents = type ? await getDocumentsByTypeServ(type) : await getAllDocumentsServ();
  res.json(documents);
};

export const createDocument = async (req: Request, res: Response) => {
  const documentData: Omit<Document, "id"> = req.body;

  const documentCreated = await addDocumentServ(documentData);
  res.json(documentCreated);
};
