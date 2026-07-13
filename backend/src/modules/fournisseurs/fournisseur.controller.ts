import { Request, Response } from "express";
import { addFournisseurServ, deleteFournisseurServ, getAllFournisseursServ } from "./fournisseur.service";
import { Fournisseur } from "./fournisseur.types";

export const getFournisseur = async (req: Request, res: Response) => {
  const fournisseurs = await getAllFournisseursServ(req.user.id_entreprise);
  res.json(fournisseurs);
};

export const createFournisseur = async (req: Request, res: Response) => {
  const fournisseurData: Omit<Fournisseur, "id" | "id_entreprise"> = req.body;

  const fournisseurCreated = await addFournisseurServ(fournisseurData, req.user.id_entreprise);
  res.json(fournisseurCreated);
};

export const deleteFournisseur = async (req: Request, res: Response) => {
  const { code_fournisseur } = req.body;

  const fournisseurDeleted = await deleteFournisseurServ(code_fournisseur);
  res.json(fournisseurDeleted);
};