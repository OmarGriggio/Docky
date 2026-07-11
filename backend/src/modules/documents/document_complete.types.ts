import { Document } from "./document.types";
import { DocumentLigne } from "./document_ligne.types";

export interface DocumentComplete extends Document {
  lignes: DocumentLigne[];
}
