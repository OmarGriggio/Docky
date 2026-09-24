import { DocumentType } from './document';

// A template type, not a document type: REMINDER is the payment reminder
// PDF's own text (its whole body lives in `introduction`, with {{placeholders}}
// the backend fills in at PDF time) - a reminder isn't a document. Kept as a
// superset of DocumentType (which includes PROJECT, never given a template -
// the database rejects it) so document-form.ts can pass its own `type` as is.
export type DocumentTemplateType = DocumentType | 'REMINDER';

export interface DocumentTemplate {
  id: number;
  company_id: number;
  type: DocumentTemplateType;
  introduction: string | null;
  conclusion: string | null;
  due_days: number | null;
}
