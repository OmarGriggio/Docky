import { DocumentType } from './document';

export interface DocumentTemplate {
  id: number;
  company_id: number;
  type: DocumentType;
  introduction: string | null;
  conclusion: string | null;
}
