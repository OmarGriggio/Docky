import { Document } from "./document.types";
import { DocumentLine } from "./document_line.types";

export interface DocumentComplete extends Document {
  lines: DocumentLine[];
}
