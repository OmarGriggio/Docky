import { Request, Response } from "express";
import { addFournisseurServ, deleteFournisseurServ, getAllFournisseursServ } from "./fournisseur.service";
import { Fournisseur } from "./fournisseur.types";

export const getFournisseur = async (req: Request, res: Response) => {
  const fournisseurs = await getAllFournisseursServ();
  res.json(fournisseurs);
};

export const createFournisseur = async (req: Request, res: Response) => {
  const fournisseurData: Fournisseur = req.body;

  const fournisseurCreated = await addFournisseurServ(fournisseurData);
  res.json(fournisseurCreated);
};

export const deleteFournisseur = async (req: Request, res: Response) => {
  const { code_fournisseur } = req.body;

  const fournisseurDeleted = await deleteFournisseurServ(code_fournisseur);
  res.json(fournisseurDeleted);
};