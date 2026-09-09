import { Document } from './document';
import { DocumentLine } from './document-line';
import { DocumentSection } from './document-section';

export interface DocumentComplete extends Document {
  sections: DocumentSection[];
  lines: DocumentLine[];
}
