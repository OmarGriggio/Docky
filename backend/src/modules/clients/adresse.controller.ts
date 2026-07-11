import { Request, Response } from "express";
import { addAdresseServ, getAllAdressesServ } from "./adresse.service";
import { Adresse } from "./adresse.types";

export const getAdresses = async (req: Request, res: Response) => {
  const adresses = await getAllAdressesServ();
  res.json(adresses);
};

export const createAdresse = async (req: Request, res: Response) => {
  const adresseData: Omit<Adresse, "id"> = req.body;

  const adresseCreated = await addAdresseServ(adresseData);
  res.json(adresseCreated);
};
