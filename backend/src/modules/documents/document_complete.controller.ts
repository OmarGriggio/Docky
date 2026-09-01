import { Request, Response } from "express";
import { getAllDocumentsCompleteServ, getDocumentCompleteServ } from "./document_complete.service";

export const getDocumentsComplete = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const documents = await getAllDocumentsCompleteServ(req.user.id_entreprise, type);
  res.json(documents);
};

export const getDocumentComplete = async (req: Request, res: Response) => {
  const document = await getDocumentCompleteServ(Number(req.params.id), req.user.id_entreprise);
  res.json(document);
};
