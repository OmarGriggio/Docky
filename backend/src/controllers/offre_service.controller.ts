import { Request, Response } from "express";
import { addOffreServiceServ, getAllOffreServicesServ } from "../services/offre_service.service";
import { OffreService } from "../types/offre_service";

export const getOffreServices = async (req: Request, res: Response) => {
  const offreServices = await getAllOffreServicesServ();
  res.json(offreServices);
};

export const createOffreService = async (req: Request, res: Response) => {
  const offreServiceData: OffreService = req.body;

  const offreServiceCreated = await addOffreServiceServ(offreServiceData);
  res.json(offreServiceCreated);
};
