import { Request, Response } from "express";
import { addOffreServ, getAllOffresServ } from "../services/offre.service";
import { Offre } from "../types/offre";

export const getOffres = async (req: Request, res: Response) => {
  const offres = await getAllOffresServ();
  res.json(offres);
};

export const createOffre = async (req: Request, res: Response) => {
  const offreData: Offre = req.body;

  const offreCreated = await addOffreServ(offreData);
  res.json(offreCreated);
};
