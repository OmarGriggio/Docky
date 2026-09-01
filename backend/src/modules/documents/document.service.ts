import { Document } from "./document.types";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByNumeroFromDB,
  createDocumentInDB
} from "./document.repository";
import { getClientByIdFromDB } from "../clients/client.repository";

export const getAllDocumentsServ = async (id_entreprise: number) => {
  return await getDocumentsFromDB(id_entreprise);
};

export const getDocumentsByTypeServ = async (type: string, id_entreprise: number) => {
  return await getDocumentsByTypeFromDB(type, id_entreprise);
};

export const addDocumentServ = async (documentData: Omit<Document, "id" | "id_entreprise">, id_entreprise: number) => {
  const existingDocument = await getDocumentByNumeroFromDB(documentData.numero);
  if (existingDocument) {
    throw new Error("Document number already exists");
  }

  const client = await getClientByIdFromDB(documentData.id_client, id_entreprise);
  if (!client) {
    throw new Error("Client not found");
  }

  return await createDocumentInDB({ ...documentData, id_entreprise });
};
