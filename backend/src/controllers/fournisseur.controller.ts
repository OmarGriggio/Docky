import { Request, Response } from "express";
import { addFournisseurServ, getAllFournisseursServ } from "../services/fournisseur.service";
import { Fournisseur } from "../types/fournisseur";

export const getFournisseur = async (req: Request, res: Response) => {
  const fournisseurs = await getAllFournisseursServ();
  res.json(fournisseurs);
};

export const createFournisseur = async (req: Request, res: Response) => {
  const fournisseurData: Fournisseur = req.body;

  const fournisseurCreated = await addFournisseurServ(fournisseurData);
  res.json(fournisseurCreated);
};