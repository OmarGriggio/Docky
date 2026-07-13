import { Request, Response } from "express";
import {
  getAllRessourceTarifsFournisseursServ,
  getRessourceTarifsFournisseursByRessourceIdServ
} from "./ressource_tarif_fournisseur.service";

export const getRessourceTarifsFournisseurs = async (req: Request, res: Response) => {
  const id_ressource = req.query.id_ressource as string | undefined;
  const id_entreprise = req.user.id_entreprise;
  const tarifs = id_ressource
    ? await getRessourceTarifsFournisseursByRessourceIdServ(Number(id_ressource), id_entreprise)
    : await getAllRessourceTarifsFournisseursServ(id_entreprise);
  res.json(tarifs);
};
