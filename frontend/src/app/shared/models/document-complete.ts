import { Document } from './document';
import { DocumentLine } from './document-line';

export interface DocumentComplete extends Document {
  lines: DocumentLine[];
}
