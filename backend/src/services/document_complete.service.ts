import { DocumentComplete } from "../types/document_complete";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByIdFromDB
} from "../repositories/document.repository";
import { getDocumentLignesFromDB, getLignesByDocumentIdFromDB } from "../repositories/document_ligne.repository";

export const getDocumentCompleteServ = async (id: number): Promise<DocumentComplete> => {
  const document = await getDocumentByIdFromDB(id);
  if (!document) {
    throw new Error("Document not found");
  }

  const lignes = await getLignesByDocumentIdFromDB(id);
  return { ...document, lignes };
};

export const getAllDocumentsCompleteServ = async (type?: string): Promise<DocumentComplete[]> => {
  const documents = type ? await getDocumentsByTypeFromDB(type) : await getDocumentsFromDB();
  const lignes = await getDocumentLignesFromDB();

  return documents.map(document => ({
    ...document,
    lignes: lignes.filter(ligne => ligne.id_document === document.id)
  }));
};
