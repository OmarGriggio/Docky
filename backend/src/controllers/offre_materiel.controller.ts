import { Request, Response } from "express";
import { addOffreMaterielServ, getAllOffreMaterielsServ } from "../services/offre_materiel.service";
import { OffreMateriel } from "../types/offre_materiel";

export const getOffreMateriels = async (req: Request, res: Response) => {
  const offreMateriels = await getAllOffreMaterielsServ();
  res.json(offreMateriels);
};

export const createOffreMateriel = async (req: Request, res: Response) => {
  const offreMaterielData: OffreMateriel = req.body;

  const offreMaterielCreated = await addOffreMaterielServ(offreMaterielData);
  res.json(offreMaterielCreated);
};
