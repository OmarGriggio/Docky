import { db } from "../../shared/config/database";
import { Template, TemplateData } from "./template.types";

// NUMERIC columns arrive as strings from pg - numbers here, like the rest of the API.
const toTemplate = (row: Record<string, unknown> | undefined): Template | null => row ? {
  ...(row as unknown as Template),
  early_payment_discount: Number(row.early_payment_discount),
  early_payment_min_amount: Number(row.early_payment_min_amount),
} : null;

// The JSONB columns go as JSON text - pg would send a JS array as a Postgres array.
const JSON_COLUMNS = new Set<keyof TemplateData>(["palette", "element_colors"]);
const valueOf = (data: TemplateData, column: keyof TemplateData) => JSON_COLUMNS.has(column) ? JSON.stringify(data[column]) : data[column];

const DATA_COLUMNS: (keyof TemplateData)[] = [
  "name", "layout", "font", "palette", "element_colors", "show_currency",
  "quote_introduction", "quote_conclusion", "quote_due_days",
  "invoice_introduction", "invoice_conclusion", "invoice_due_days",
  "payment_terms", "early_payment_discount", "early_payment_days", "early_payment_min_amount", "reminder_text",
];

/** The company's templates, its default first, then by name - archived ones only when asked. */
export const getTemplatesFromDB = async (company_id: number, includeArchived = false): Promise<Template[]> => {
  const result = await db().query(
    `SELECT * FROM templates WHERE company_id = $1 ${includeArchived ? "" : "AND is_active = true"}
     ORDER BY is_default DESC, lower(name), id`,
    [company_id]
  );
  return result.rows.map(row => toTemplate(row)!);
};

export const getTemplateByIdFromDB = async (id: number, company_id: number): Promise<Template | null> => {
  const result = await db().query("SELECT * FROM templates WHERE id = $1 AND company_id = $2", [id, company_id]);
  return toTemplate(result.rows[0]);
};

export const getDefaultTemplateFromDB = async (company_id: number): Promise<Template | null> => {
  const result = await db().query(
    "SELECT * FROM templates WHERE company_id = $1 AND is_default AND is_active ORDER BY id LIMIT 1",
    [company_id]
  );
  return toTemplate(result.rows[0]);
};

export const createTemplateInDB = async (company_id: number, data: TemplateData, options: { is_default: boolean; header_image: string | null }): Promise<Template> => {
  const columns = [...DATA_COLUMNS, "company_id", "is_default", "header_image"];
  const values = [...DATA_COLUMNS.map(column => valueOf(data, column)), company_id, options.is_default, options.header_image];
  const result = await db().query(
    `INSERT INTO templates (${columns.join(", ")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
    values
  );
  return toTemplate(result.rows[0])!;
};

export const updateTemplateInDB = async (id: number, company_id: number, data: TemplateData): Promise<Template | null> => {
  const result = await db().query(
    `UPDATE templates SET ${DATA_COLUMNS.map((column, i) => `${column} = $${i + 3}`).join(", ")}
     WHERE id = $1 AND company_id = $2 RETURNING *`,
    [id, company_id, ...DATA_COLUMNS.map(column => valueOf(data, column))]
  );
  return toTemplate(result.rows[0]);
};

/**
 * This template the company's default, every other one not - the previous
 * one unset first: templates_one_default is checked row by row, a single
 * UPDATE swapping both would trip it. Run inside a transaction
 * (setDefaultTemplateServ), so nobody sees the company without one.
 */
export const setDefaultTemplateInDB = async (id: number, company_id: number): Promise<Template | null> => {
  await db().query("UPDATE templates SET is_default = false WHERE company_id = $1 AND is_default AND id <> $2", [company_id, id]);
  const result = await db().query(
    "UPDATE templates SET is_default = true WHERE id = $1 AND company_id = $2 RETURNING *",
    [id, company_id]
  );
  return toTemplate(result.rows[0]);
};

export const setTemplateActiveInDB = async (id: number, company_id: number, is_active: boolean): Promise<Template | null> => {
  const result = await db().query(
    "UPDATE templates SET is_active = $3 WHERE id = $1 AND company_id = $2 RETURNING *",
    [id, company_id, is_active]
  );
  return toTemplate(result.rows[0]);
};

export const updateTemplateHeaderImageInDB = async (id: number, company_id: number, header_image: string | null): Promise<Template | null> => {
  const result = await db().query(
    "UPDATE templates SET header_image = $3 WHERE id = $1 AND company_id = $2 RETURNING *",
    [id, company_id, header_image]
  );
  return toTemplate(result.rows[0]);
};

/**
 * Whether a header image is still printed by something else than this
 * template - another template sharing it (a copy), or a document sent with
 * it (documents.template_style) - its file is kept then.
 */
export const isHeaderImageInUseInDB = async (company_id: number, header_image: string, template_id: number): Promise<boolean> => {
  const result = await db().query(
    `SELECT 1 FROM templates WHERE company_id = $1 AND header_image = $2 AND id <> $3
     UNION ALL
     SELECT 1 FROM documents WHERE company_id = $1 AND template_style->>'header_image' = $2
     LIMIT 1`,
    [company_id, header_image, template_id]
  );
  return result.rows.length > 0;
};
