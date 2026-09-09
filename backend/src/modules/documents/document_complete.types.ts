import { Document } from "./document.types";
import { DocumentLine } from "./document_line.types";
import { DocumentSection } from "./document_section.types";

export interface DocumentComplete extends Document {
  sections: DocumentSection[];
  lines: DocumentLine[];
}
