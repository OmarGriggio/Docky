import { Request, Response } from "express";
import { getAllFacturesLignesServ } from "../services/facture_ligne.service";

export const getFacturesLignes = async (req: Request, res: Response) => {
  const factures = await getAllFacturesLignesServ();
  res.json(factures);
};