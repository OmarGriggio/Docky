import { Request, Response } from "express";
import { addChantierServ, deleteChantierServ, getAllChantiersServ } from "./chantier.service";
import { CreateChantierData } from "./chantier.types";

export const getChantiers = async (req: Request, res: Response) => {
  const chantiers = await getAllChantiersServ();
  res.json(chantiers);
};

export const createChantier = async (req: Request, res: Response) => {
  const chantierData: CreateChantierData = req.body;

  const chantierCreated = await addChantierServ(chantierData);
  res.json(chantierCreated);
};

export const deleteChantier = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const chantierDeleted = await deleteChantierServ(id);
  res.json(chantierDeleted);
};
