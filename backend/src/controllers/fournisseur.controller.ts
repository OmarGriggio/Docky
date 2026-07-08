import { Request, Response } from "express";
import { getAllFournisseursServ } from "../services/fournisseur.service";

export const getFournisseur = async (req: Request, res: Response) => {
  const fournisseurs = await getAllFournisseursServ();
  res.json(fournisseurs);
};