import { Document } from "./document.types";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByIdFromDB,
  getDocumentByNumeroFromDB,
  createDocumentInDB,
  archiveDocumentInDB,
  unarchiveDocumentInDB
} from "./document.repository";
import { getClientByIdFromDB } from "../clients/client.repository";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

export const getAllDocumentsServ = async (id_entreprise: number, includeArchived = false) => {
  return await getDocumentsFromDB(id_entreprise, includeArchived);
};

export const getDocumentsByTypeServ = async (type: string, id_entreprise: number, includeArchived = false) => {
  return await getDocumentsByTypeFromDB(type, id_entreprise, includeArchived);
};

export const addDocumentServ = async (documentData: Omit<Document, "id" | "id_entreprise">, id_entreprise: number) => {
  const existingDocument = await getDocumentByNumeroFromDB(documentData.numero);
  if (existingDocument) {
    throw new ConflictError("Document number already exists");
  }

  const client = await getClientByIdFromDB(documentData.id_client, id_entreprise);
  if (!client) {
    throw new NotFoundError("Client not found");
  }

  return await createDocumentInDB({ ...documentData, id_entreprise });
};

export const archiveDocumentServ = async (id: number, id_entreprise: number) => {
  const document = await getDocumentByIdFromDB(id, id_entreprise);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  return await archiveDocumentInDB(id, id_entreprise);
};

export const unarchiveDocumentServ = async (id: number, id_entreprise: number) => {
  const document = await getDocumentByIdFromDB(id, id_entreprise);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  return await unarchiveDocumentInDB(id, id_entreprise);
};
