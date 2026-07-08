import { Request, Response } from "express";
import { getAllFacturesServ } from "../services/facture.service";

export const getFactures = async (req: Request, res: Response) => {
  const factures = await getAllFacturesServ();
  res.json(factures);
};