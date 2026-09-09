import { pool } from "../../shared/config/database";
import { DocumentTemplate } from "./document_template.types";
import { DocumentType } from "./document.types";

export const getTemplateByTypeFromDB = async (type: DocumentType, company_id: number) => {
  const result = await pool.query(
    "SELECT * FROM document_templates WHERE type = $1 AND company_id = $2",
    [type, company_id]
  );
  return result.rows[0] ?? null;
};

// At most one row per (company_id, type) - insert it the first time it's
// saved, update it every time after that.
export const upsertTemplateInDB = async (
  template: Omit<DocumentTemplate, "id">
): Promise<DocumentTemplate> => {
  const query = `
    INSERT INTO document_templates (company_id, type, introduction, conclusion)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (company_id, type)
    DO UPDATE SET introduction = EXCLUDED.introduction, conclusion = EXCLUDED.conclusion
    RETURNING *;
  `;

  const values = [template.company_id, template.type, template.introduction, template.conclusion];

  const result = await pool.query(query, values);
  return result.rows[0];
};
