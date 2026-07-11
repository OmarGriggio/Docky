import { Document } from "../types/document";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByNumeroFromDB,
  createDocumentInDB
} from "../repositories/document.repository";

export const getAllDocumentsServ = async () => {
  return await getDocumentsFromDB();
};

export const getDocumentsByTypeServ = async (type: string) => {
  return await getDocumentsByTypeFromDB(type);
};

export const addDocumentServ = async (documentData: Omit<Document, "id">) => {
  const existingDocument = await getDocumentByNumeroFromDB(documentData.numero);
  if (existingDocument) {
    throw new Error("Document number already exists");
  }
  return await createDocumentInDB(documentData);
};
