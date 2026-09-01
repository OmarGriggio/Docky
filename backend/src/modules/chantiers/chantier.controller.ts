import { Request, Response } from "express";
import { addChantierServ, archiveChantierServ, unarchiveChantierServ, getAllChantiersServ } from "./chantier.service";
import { CreateChantierData } from "./chantier.types";

export const getChantiers = async (req: Request, res: Response) => {
  const includeArchived = req.query.includeArchived === "true";
  const chantiers = await getAllChantiersServ(req.user.id_entreprise, includeArchived);
  res.json(chantiers);
};

export const createChantier = async (req: Request, res: Response) => {
  const chantierData: CreateChantierData = req.body;

  const chantierCreated = await addChantierServ(chantierData, req.user.id_entreprise);
  res.json(chantierCreated);
};

export const archiveChantier = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const chantierArchived = await archiveChantierServ(id, req.user.id_entreprise);
  res.json(chantierArchived);
};

export const unarchiveChantier = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const chantierUnarchived = await unarchiveChantierServ(id, req.user.id_entreprise);
  res.json(chantierUnarchived);
};
