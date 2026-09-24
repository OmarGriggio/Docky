import { Request, Response } from "express";
import { getTemplateServ, upsertTemplateServ } from "./document_template.service";
import { DocumentTemplateType } from "./document_template.types";

export const getDocumentTemplate = async (req: Request, res: Response) => {
  const type = req.query.type as DocumentTemplateType;
  const template = await getTemplateServ(type, req.user.company_id);
  res.json(template);
};

export const upsertDocumentTemplate = async (req: Request, res: Response) => {
  const type = req.params.type as DocumentTemplateType;
  const { introduction, conclusion, due_days } = req.body;
  const template = await upsertTemplateServ(type, { introduction, conclusion, due_days }, req.user.company_id);
  res.json(template);
};
