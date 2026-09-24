// A template type, not a document type: REMINDER is the payment reminder
// PDF's own text - a reminder isn't a documents row (see
// zz_migrations/000_base.sql, document_templates.type).
export type DocumentTemplateType = "QUOTE" | "INVOICE" | "REMINDER";

export interface DocumentTemplate {
  id: number;
  company_id: number;
  type: DocumentTemplateType;
  introduction: string | null;
  conclusion: string | null;
  due_days: number | null;
}
