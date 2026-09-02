import { Request, Response } from "express";
import { getLignesForDocumentServ, addLigneServ, archiveLigneServ, unarchiveLigneServ } from "./document_ligne.service";
import { DocumentLigne } from "./document_ligne.types";

export const getLignes = async (req: Request, res: Response) => {
  const id_document = Number(req.query.id_document);
  const includeArchived = req.query.includeArchived === "true";

  const lignes = await getLignesForDocumentServ(id_document, req.user.id_entreprise, includeArchived);
  res.json(lignes);
};

export const createLigne = async (req: Request, res: Response) => {
  const { id_document, ...ligneData }: Omit<DocumentLigne, "id" | "id_entreprise" | "pos" | "actif"> & { id_document: number } = req.body;

  const ligneCreated = await addLigneServ(ligneData, id_document, req.user.id_entreprise);
  res.json(ligneCreated);
};

export const archiveLigne = async (req: Request, res: Response) => {
  const ligneArchived = await archiveLigneServ(Number(req.params.id), req.user.id_entreprise);
  res.json(ligneArchived);
};

export const unarchiveLigne = async (req: Request, res: Response) => {
  const ligneUnarchived = await unarchiveLigneServ(Number(req.params.id), req.user.id_entreprise);
  res.json(ligneUnarchived);
};
