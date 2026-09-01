import { Request, Response } from "express";
import { getAllRessourcesServ, getRessourcesByTypeServ, archiveRessourceServ, unarchiveRessourceServ } from "./ressource.service";

export const getRessources = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const id_entreprise = req.user.id_entreprise;
  const includeArchived = req.query.includeArchived === "true";
  const ressources = type
    ? await getRessourcesByTypeServ(type, id_entreprise, includeArchived)
    : await getAllRessourcesServ(id_entreprise, includeArchived);
  res.json(ressources);
};

export const archiveRessource = async (req: Request, res: Response) => {
  const ressourceArchived = await archiveRessourceServ(Number(req.params.id), req.user.id_entreprise);
  res.json(ressourceArchived);
};

export const unarchiveRessource = async (req: Request, res: Response) => {
  const ressourceUnarchived = await unarchiveRessourceServ(Number(req.params.id), req.user.id_entreprise);
  res.json(ressourceUnarchived);
};
