import { ProjectAttachment } from "./project_attachment.types";
import {
  getAttachmentsByProjectIdFromDB,
  getAttachmentByIdFromDB,
  createAttachmentInDB,
  deleteAttachmentFromDB,
  archiveAttachmentInDB,
  unarchiveAttachmentInDB,
  getStorageUsedByCompanyFromDB
} from "./project_attachment.repository";
import { getProjectByIdFromDB } from "./project.repository";
import { AppError, NotFoundError } from "../../shared/types/errors";

// Per company, every project attachment together - enough for a small
// company's plans and site photos, and what keeps one company (or the
// public demo account) from filling the disk MinIO shares with Postgres.
const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024;

export const getAttachmentsForProjectServ = async (project_id: number, company_id: number, includeArchived = false) => {
  const project = await getProjectByIdFromDB(project_id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  return await getAttachmentsByProjectIdFromDB(project_id, includeArchived);
};

export const getAttachmentServ = async (id: number, company_id: number) => {
  const attachment = await getAttachmentByIdFromDB(id, company_id);
  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }
  return attachment;
};

// Only inserts the DB row - the controller uploads the file to S3 once it
// has the row's id (the storage key is built from it, see
// project_attachment.controller.ts), and deletes the row again if that
// upload fails.
export const addAttachmentServ = async (
  fileData: Pick<ProjectAttachment, "filename" | "mime_type" | "size_bytes">,
  project_id: number,
  company_id: number,
  uploaded_by: number
): Promise<ProjectAttachment> => {
  const project = await getProjectByIdFromDB(project_id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const used = await getStorageUsedByCompanyFromDB(company_id);
  if (used + fileData.size_bytes > STORAGE_QUOTA_BYTES) {
    throw new AppError("Storage quota reached (500 MB per company)", 413);
  }

  return await createAttachmentInDB({
    ...fileData,
    project_id,
    company_id,
    uploaded_by,
    is_active: true
  });
};

export const removeFailedAttachmentServ = async (id: number, company_id: number) => {
  await deleteAttachmentFromDB(id, company_id);
};

export const archiveAttachmentServ = async (id: number, company_id: number) => {
  const attachment = await getAttachmentByIdFromDB(id, company_id);
  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }
  return await archiveAttachmentInDB(id, company_id);
};

export const unarchiveAttachmentServ = async (id: number, company_id: number) => {
  const attachment = await getAttachmentByIdFromDB(id, company_id);
  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }
  return await unarchiveAttachmentInDB(id, company_id);
};
