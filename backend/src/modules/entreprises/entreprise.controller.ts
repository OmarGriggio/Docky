import { Request, Response } from "express";
import { addEntrepriseServ, getAllEntreprisesServ, getEntrepriseByIdServ, updateEntrepriseServ } from "./entreprise.service";
import { Entreprise } from "./entreprise.types";

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

export const updateEntreprise = async (req: Request, res: Response) => {
    const entrepriseData: Omit<Entreprise, "id"> = req.body;

    const entrepriseUpdated = await updateEntrepriseServ(Number(req.params.id), entrepriseData);
    res.json(entrepriseUpdated);
};
