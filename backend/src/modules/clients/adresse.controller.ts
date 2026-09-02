import { Request, Response } from "express";
import { addAdresseServ, deleteAdresseServ, getAllAdressesServ } from "./adresse.service";
import { Adresse } from "./adresse.types";

export const getAdresses = async (req: Request, res: Response) => {
  const adresses = await getAllAdressesServ(req.user.id_entreprise);
  res.json(adresses);
};

export const createAdresse = async (req: Request, res: Response) => {
  const adresseData: Omit<Adresse, "id" | "id_entreprise"> = req.body;

  const adresseCreated = await addAdresseServ(adresseData, req.user.id_entreprise);
  res.json(adresseCreated);
};

export const deleteAdresse = async (req: Request, res: Response) => {
  const adresseDeleted = await deleteAdresseServ(Number(req.params.id), req.user.id_entreprise);
  res.json(adresseDeleted);
};
