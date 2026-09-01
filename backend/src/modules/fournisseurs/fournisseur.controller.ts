import { Request, Response } from "express";
import { addFournisseurServ, archiveFournisseurServ, unarchiveFournisseurServ, getAllFournisseursServ } from "./fournisseur.service";
import { Fournisseur } from "./fournisseur.types";

export const getFournisseur = async (req: Request, res: Response) => {
  const includeArchived = req.query.includeArchived === "true";
  const fournisseurs = await getAllFournisseursServ(req.user.id_entreprise, includeArchived);
  res.json(fournisseurs);
};

export const createFournisseur = async (req: Request, res: Response) => {
  const fournisseurData: Omit<Fournisseur, "id" | "id_entreprise"> = req.body;

  const fournisseurCreated = await addFournisseurServ(fournisseurData, req.user.id_entreprise);
  res.json(fournisseurCreated);
};

export const archiveFournisseur = async (req: Request, res: Response) => {
  const fournisseurArchived = await archiveFournisseurServ(Number(req.params.id), req.user.id_entreprise);
  res.json(fournisseurArchived);
};

export const unarchiveFournisseur = async (req: Request, res: Response) => {
  const fournisseurUnarchived = await unarchiveFournisseurServ(Number(req.params.id), req.user.id_entreprise);
  res.json(fournisseurUnarchived);
};