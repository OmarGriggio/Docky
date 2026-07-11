import { Request, Response } from "express";
import { getAllRessourcesServ, getRessourcesByTypeServ } from "./ressource.service";

export const getRessources = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const ressources = type ? await getRessourcesByTypeServ(type) : await getAllRessourcesServ();
  res.json(ressources);
};
