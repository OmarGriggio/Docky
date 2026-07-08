import { Request, Response } from "express";
import { getAllMaterielsServ } from "../services/materiel.service";

export const getMateriels = async (req: Request, res: Response) => {
  const materiel = await getAllMaterielsServ();
  res.json(materiel);
};