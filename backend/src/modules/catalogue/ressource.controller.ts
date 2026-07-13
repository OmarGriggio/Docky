import { Request, Response } from "express";
import { getAllRessourcesServ, getRessourcesByTypeServ } from "./ressource.service";

export const getRessources = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const id_entreprise = req.user.id_entreprise;
  const ressources = type
    ? await getRessourcesByTypeServ(type, id_entreprise)
    : await getAllRessourcesServ(id_entreprise);
  res.json(ressources);
};
