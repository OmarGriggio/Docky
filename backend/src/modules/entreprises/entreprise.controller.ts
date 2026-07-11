import { Request, Response } from "express";
import { addEntrepriseServ, getAllEntreprisesServ, getEntrepriseByIdServ } from "../services/entreprise.service";
import { Entreprise } from "../types/entreprise";

export const getEntreprises = async (req: Request, res: Response) => {
  const entreprises = await getAllEntreprisesServ();
  res.json(entreprises);
};

export const getEntreprise = async (req: Request, res: Response) => {
  const entreprise = await getEntrepriseByIdServ(Number(req.params.id));
  res.json(entreprise);
};

export const createEntreprise = async (req: Request, res: Response) => {
    const entrepriseData: Omit<Entreprise, "id"> = req.body

    const entrepriseCreated = await addEntrepriseServ(entrepriseData);
    res.json(entrepriseCreated);
};
