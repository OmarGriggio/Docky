import { Request, Response } from "express";
import {
  getAllRessourceTarifsFournisseursServ,
  getRessourceTarifsFournisseursByRessourceIdServ
} from "../services/ressource_tarif_fournisseur.service";

export const getRessourceTarifsFournisseurs = async (req: Request, res: Response) => {
  const id_ressource = req.query.id_ressource as string | undefined;
  const tarifs = id_ressource
    ? await getRessourceTarifsFournisseursByRessourceIdServ(Number(id_ressource))
    : await getAllRessourceTarifsFournisseursServ();
  res.json(tarifs);
};
