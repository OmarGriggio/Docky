import { Document } from "./document.types";
import {
  getDocumentsFromDB,
  getDocumentsByTypeFromDB,
  getDocumentByIdFromDB,
  getDocumentByNumeroFromDB,
  createDocumentInDB,
  archiveDocumentInDB,
  unarchiveDocumentInDB,
  updateDocumentTotalsInDB
} from "./document.repository";
import { getLignesByDocumentIdFromDB } from "./document_ligne.repository";
import { getClientByIdFromDB } from "../clients/client.repository";
import { getChantierByIdFromDB } from "../chantiers/chantier.repository";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

const round2 = (value: number) => Math.round(value * 100) / 100;

export const getAllDocumentsServ = async (id_entreprise: number, includeArchived = false) => {
  return await getDocumentsFromDB(id_entreprise, includeArchived);
};

export const getDocumentsByTypeServ = async (type: string, id_entreprise: number, includeArchived = false) => {
  return await getDocumentsByTypeFromDB(type, id_entreprise, includeArchived);
};

export const getDocumentByIdServ = async (id: number, id_entreprise: number) => {
  const document = await getDocumentByIdFromDB(id, id_entreprise);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  return document;
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

  if (documentData.id_chantier !== null) {
    const chantier = await getChantierByIdFromDB(documentData.id_chantier, id_entreprise);
    if (!chantier) {
      throw new NotFoundError("Chantier not found");
    }
  }

  // montant_ht/montant_ttc are always computed from the document's lines (see
  // recomputeDocumentTotalsServ) — a freshly created document has none yet, so it
  // always starts at 0, whatever the request body sent for those fields.
  return await createDocumentInDB({ ...documentData, id_entreprise, montant_ht: 0, montant_ttc: 0 });
};

// No VAT rate exists anywhere in the app yet, so montant_ttc is simply montant_ht
// for now — there's nothing to add to it. montant_ht is the sum of each active
// line's own total (quantité × prix unitaire × (1 − rabais ligne%)), with the
// document's own rabais% applied on top of that sum.
export const recomputeDocumentTotalsServ = async (id_document: number, id_entreprise: number) => {
  const document = await getDocumentByIdFromDB(id_document, id_entreprise);
  if (!document) {
    throw new NotFoundError("Document not found");
  }

  const lignes = await getLignesByDocumentIdFromDB(id_document);

  const sousTotal = lignes.reduce((sum, ligne) => {
    const ligneTotal = ligne.quantite * ligne.prix_unitaire * (1 - ligne.rabais / 100);
    return sum + ligneTotal;
  }, 0);

  const montant_ht = round2(sousTotal * (1 - document.rabais / 100));
  const montant_ttc = montant_ht;

  return await updateDocumentTotalsInDB(id_document, id_entreprise, montant_ht, montant_ttc);
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
