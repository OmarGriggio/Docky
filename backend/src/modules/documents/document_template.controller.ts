import { Request, Response } from "express";
import { getTemplateServ, upsertTemplateServ } from "./document_template.service";
import { DocumentType } from "./document.types";

export const getDocumentTemplate = async (req: Request, res: Response) => {
  const type = req.query.type as DocumentType;
  const template = await getTemplateServ(type, req.user.company_id);
  res.json(template);
};

export const upsertDocumentTemplate = async (req: Request, res: Response) => {
  const type = req.params.type as DocumentType;
  const { introduction, conclusion } = req.body;
  const template = await upsertTemplateServ(type, { introduction, conclusion }, req.user.company_id);
  res.json(template);
};
