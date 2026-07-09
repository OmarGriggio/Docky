import { Request, Response } from "express";
import { getAllCatalogueServ, getCatalogueByTypeServ } from "../services/catalogue.service";

export const getCatalogue = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const catalogue = type ? await getCatalogueByTypeServ(type) : await getAllCatalogueServ();
  res.json(catalogue);
};
