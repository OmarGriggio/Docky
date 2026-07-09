import { Request, Response } from "express";
import { getAllFacturesCompleteServ, getFactureCompleteServ } from "../services/facture_complete.service";

export const getFacturesComplete = async (req: Request, res: Response) => {
  const factures = await getAllFacturesCompleteServ();
  res.json(factures);
};

export const getFactureComplete = async (req: Request, res: Response) => {
  const facture = await getFactureCompleteServ(Number(req.params.id));
  res.json(facture);
};
