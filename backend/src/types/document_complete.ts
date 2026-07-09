import { Document } from "./document";
import { DocumentLigne } from "./document_ligne";

export interface DocumentComplete extends Document {
  lignes: DocumentLigne[];
}
