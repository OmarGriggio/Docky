import { DocumentComplete } from "./document_complete.types";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByIdFromDB
} from "./document.repository";
import { getDocumentLignesFromDB, getLignesByDocumentIdFromDB } from "./document_ligne.repository";

export const getDocumentCompleteServ = async (id: number, id_entreprise: number): Promise<DocumentComplete> => {
  const document = await getDocumentByIdFromDB(id, id_entreprise);
  if (!document) {
    throw new Error("Document not found");
  }

  const lignes = await getLignesByDocumentIdFromDB(id);
  return { ...document, lignes };
};

export const getAllDocumentsCompleteServ = async (id_entreprise: number, type?: string): Promise<DocumentComplete[]> => {
  const documents = type
    ? await getDocumentsByTypeFromDB(type, id_entreprise)
    : await getDocumentsFromDB(id_entreprise);
  const lignes = await getDocumentLignesFromDB(id_entreprise);

  return documents.map(document => ({
    ...document,
    lignes: lignes.filter(ligne => ligne.id_document === document.id)
  }));
};
