import { Request, Response } from "express";
import path from "path";
import { addEntrepriseServ, getAllEntreprisesServ, getEntrepriseByIdServ, updateEntrepriseServ, updateEntrepriseLogoServ } from "./entreprise.service";
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

export const uploadEntrepriseLogo = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ message: "Aucun fichier reçu" });
        return;
    }

    const logo = path.posix.join("entreprises", String(req.params.id), req.file.filename);
    const entreprise = await updateEntrepriseLogoServ(Number(req.params.id), logo);
    res.json(entreprise);
};
