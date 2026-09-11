import { pool } from "../../shared/config/database";
import { ProjectAttachment } from "./project_attachment.types";

export const getAttachmentsByProjectIdFromDB = async (project_id: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM project_attachments WHERE project_id = $1 ORDER BY created_at DESC"
    : "SELECT * FROM project_attachments WHERE project_id = $1 AND is_active = true ORDER BY created_at DESC";
  const result = await pool.query(query, [project_id]);
  return result.rows;
};

export const getAttachmentByIdFromDB = async (id: number, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM project_attachments WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
  return result.rows[0] ?? null;
};

export const createAttachmentInDB = async (
  attachment: Omit<ProjectAttachment, "id" | "created_at">
): Promise<ProjectAttachment> => {
  const query = `
    INSERT INTO project_attachments (
      company_id,
      project_id,
      uploaded_by,
      filename,
      mime_type,
      size_bytes,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    attachment.company_id,
    attachment.project_id,
    attachment.uploaded_by,
    attachment.filename,
    attachment.mime_type,
    attachment.size_bytes,
    attachment.is_active
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const deleteAttachmentFromDB = async (id: number, company_id: number): Promise<void> => {
  await pool.query(
    "DELETE FROM project_attachments WHERE id = $1 AND company_id = $2",
    [id, company_id]
  );
};

export const archiveAttachmentInDB = async (id: number, company_id: number): Promise<ProjectAttachment> => {
  const query = `
    UPDATE project_attachments SET is_active = false
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};

export const unarchiveAttachmentInDB = async (id: number, company_id: number): Promise<ProjectAttachment> => {
  const query = `
    UPDATE project_attachments SET is_active = true
      WHERE id = $1 AND company_id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, company_id]);
  return result.rows[0];
};
