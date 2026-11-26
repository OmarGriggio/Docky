import { Request, Response } from "express";
import { randomBytes } from "crypto";
import { EXTENSION_BY_MIME } from "../companies/company.upload";
import { uploadFileServ } from "../../shared/storage/storage.service";
import { generateTemplatePreviewServ } from "../../pdf/pdf.service";
import {
  archiveTemplateServ, createTemplateServ, duplicateTemplateServ, getTemplateServ, getTemplatesServ,
  setDefaultTemplateServ, setTemplateHeaderImageServ, unarchiveTemplateServ, updateTemplateServ,
} from "./template.service";

export const getTemplates = async (req: Request, res: Response) => {
  res.json(await getTemplatesServ(req.user.company_id, req.query.includeArchived === "true"));
};

export const getTemplate = async (req: Request, res: Response) => {
  res.json(await getTemplateServ(Number(req.params.id), req.user.company_id));
};

export const createTemplate = async (req: Request, res: Response) => {
  res.json(await createTemplateServ(req.user.company_id, req.body ?? {}));
};

export const duplicateTemplate = async (req: Request, res: Response) => {
  res.json(await duplicateTemplateServ(Number(req.params.id), req.user.company_id, req.body?.name));
};

export const updateTemplate = async (req: Request, res: Response) => {
  res.json(await updateTemplateServ(Number(req.params.id), req.user.company_id, req.body ?? {}));
};

export const setDefaultTemplate = async (req: Request, res: Response) => {
  res.json(await setDefaultTemplateServ(Number(req.params.id), req.user.company_id));
};

export const archiveTemplate = async (req: Request, res: Response) => {
  res.json(await archiveTemplateServ(Number(req.params.id), req.user.company_id));
};

export const unarchiveTemplate = async (req: Request, res: Response) => {
  res.json(await unarchiveTemplateServ(Number(req.params.id), req.user.company_id));
};

// A new key every upload (never overwritten): a document sent with the
// previous image keeps printing it (documents.template_style) - the old file
// is only deleted once nothing prints it any more (setTemplateHeaderImageServ).
// Built here from the company and the template, never from the request.
export const uploadTemplateHeaderImage = async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: "Aucun fichier reçu" });
    return;
  }
  const id = Number(req.params.id);
  await getTemplateServ(id, req.user.company_id);
  const key = `companies/${req.user.company_id}/templates/${id}/header-${randomBytes(6).toString("hex")}${EXTENSION_BY_MIME[req.file.mimetype]}`;
  await uploadFileServ(key, req.file.buffer, req.file.mimetype);
  res.json(await setTemplateHeaderImageServ(id, req.user.company_id, key));
};

export const removeTemplateHeaderImage = async (req: Request, res: Response) => {
  res.json(await setTemplateHeaderImageServ(Number(req.params.id), req.user.company_id, null));
};

// The editor's live preview: { type: QUOTE | INVOICE | REMINDER, template: the unsaved fields, level: a reminder's, highlight: an element spotted }.
export const previewTemplate = async (req: Request, res: Response) => {
  const bytes = await generateTemplatePreviewServ(Number(req.params.id), req.user.company_id, req.body?.type, req.body?.template ?? {}, req.user.language, req.body?.level, req.body?.highlight);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=preview.pdf");
  res.send(Buffer.from(bytes));
};
