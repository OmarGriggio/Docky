import { Request, Response } from "express";
import { addDocumentServ, getAllDocumentsServ, getDocumentsByTypeServ } from "./document.service";
import { Document } from "./document.types";

export const getDocuments = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const id_entreprise = req.user.id_entreprise;
  const documents = type
    ? await getDocumentsByTypeServ(type, id_entreprise)
    : await getAllDocumentsServ(id_entreprise);
  res.json(documents);
};

export const createDocument = async (req: Request, res: Response) => {
  const documentData: Omit<Document, "id" | "id_entreprise"> = req.body;

  const documentCreated = await addDocumentServ(documentData, req.user.id_entreprise);
  res.json(documentCreated);
};
