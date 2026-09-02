import { DocumentLigne } from "./document_ligne.types";
import {
  getLignesByDocumentIdFromDB,
  getLigneByIdFromDB,
  getNextPosForDocumentFromDB,
  createLigneInDB,
  archiveLigneInDB,
  unarchiveLigneInDB
} from "./document_ligne.repository";
import { getDocumentByIdFromDB } from "./document.repository";
import { recomputeDocumentTotalsServ } from "./document.service";
import { NotFoundError } from "../../shared/types/errors";

export const getLignesForDocumentServ = async (id_document: number, id_entreprise: number, includeArchived = false) => {
  const document = await getDocumentByIdFromDB(id_document, id_entreprise);
  if (!document) {
    throw new NotFoundError("Document not found");
  }
  return await getLignesByDocumentIdFromDB(id_document, includeArchived);
};

export const addLigneServ = async (
  ligneData: Omit<DocumentLigne, "id" | "id_entreprise" | "id_document" | "pos" | "actif">,
  id_document: number,
  id_entreprise: number
) => {
  const document = await getDocumentByIdFromDB(id_document, id_entreprise);
  if (!document) {
    throw new NotFoundError("Document not found");
  }

  const pos = await getNextPosForDocumentFromDB(id_document);
  const ligne = await createLigneInDB({ ...ligneData, id_document, id_entreprise, pos, actif: true });

  await recomputeDocumentTotalsServ(id_document, id_entreprise);

  return ligne;
};

export const archiveLigneServ = async (id: number, id_entreprise: number) => {
  const ligne = await getLigneByIdFromDB(id, id_entreprise);
  if (!ligne) {
    throw new NotFoundError("Ligne not found");
  }

  const archived = await archiveLigneInDB(id, id_entreprise);
  await recomputeDocumentTotalsServ(ligne.id_document, id_entreprise);

  return archived;
};

export const unarchiveLigneServ = async (id: number, id_entreprise: number) => {
  const ligne = await getLigneByIdFromDB(id, id_entreprise);
  if (!ligne) {
    throw new NotFoundError("Ligne not found");
  }

  const unarchived = await unarchiveLigneInDB(id, id_entreprise);
  await recomputeDocumentTotalsServ(ligne.id_document, id_entreprise);

  return unarchived;
};
