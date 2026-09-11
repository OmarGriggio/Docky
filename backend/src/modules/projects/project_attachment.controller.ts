import { Request, Response } from "express";
import path from "path";
import {
  getAttachmentsForProjectServ,
  getAttachmentServ,
  addAttachmentServ,
  removeFailedAttachmentServ,
  archiveAttachmentServ,
  unarchiveAttachmentServ
} from "./project_attachment.service";
import { uploadFileServ, getFileServ } from "../../shared/storage/storage.service";
import { ProjectAttachment } from "./project_attachment.types";

// No storage_key column (see the migration) - the key is always rebuilt from
// these four values, so it can never drift out of sync with the DB row.
// Only the filename comes from the user, so it's the only part sanitized
// here (strip anything that isn't a plain filename character, in particular
// "/" and ".." which would otherwise let a crafted filename escape the
// attachment's own S3 prefix).
const buildAttachmentKey = (attachment: Pick<ProjectAttachment, "id" | "company_id" | "project_id" | "filename">) => {
  const safeFilename = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.posix.join(
    "companies", String(attachment.company_id),
    "projects", String(attachment.project_id),
    "attachments", `${attachment.id}-${safeFilename}`
  );
};

export const getProjectAttachments = async (req: Request, res: Response) => {
  const project_id = Number(req.query.project_id);
  const includeArchived = req.query.includeArchived === "true";

  const attachments = await getAttachmentsForProjectServ(project_id, req.user.company_id, includeArchived);
  res.json(attachments);
};

export const uploadProjectAttachment = async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: "Aucun fichier reçu" });
    return;
  }

  const project_id = Number(req.params.projectId);

  const attachment = await addAttachmentServ(
    { filename: req.file.originalname, mime_type: req.file.mimetype, size_bytes: req.file.size },
    project_id,
    req.user.company_id,
    req.user.userId
  );

  try {
    await uploadFileServ(buildAttachmentKey(attachment), req.file.buffer, req.file.mimetype);
  } catch (err) {
    // Don't leave a DB row pointing at a file that was never actually
    // written to S3.
    await removeFailedAttachmentServ(attachment.id, req.user.company_id);
    throw err;
  }

  res.json(attachment);
};

export const downloadProjectAttachment = async (req: Request, res: Response) => {
  const attachment = await getAttachmentServ(Number(req.params.id), req.user.company_id);

  const file = await getFileServ(buildAttachmentKey(attachment));
  if (!file) {
    res.sendStatus(404);
    return;
  }

  res.setHeader("Content-Type", attachment.mime_type);
  res.setHeader("Content-Disposition", `attachment; filename="${attachment.filename.replace(/"/g, "")}"`);
  file.body.pipe(res);
};

export const archiveProjectAttachment = async (req: Request, res: Response) => {
  const attachmentArchived = await archiveAttachmentServ(Number(req.params.id), req.user.company_id);
  res.json(attachmentArchived);
};

export const unarchiveProjectAttachment = async (req: Request, res: Response) => {
  const attachmentUnarchived = await unarchiveAttachmentServ(Number(req.params.id), req.user.company_id);
  res.json(attachmentUnarchived);
};
