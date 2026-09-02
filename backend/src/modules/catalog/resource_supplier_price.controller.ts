import { Request, Response } from "express";
import {
  getAllResourceSupplierPricesServ,
  getResourceSupplierPricesByResourceIdServ
} from "./resource_supplier_price.service";

export const getResourceSupplierPrices = async (req: Request, res: Response) => {
  const resource_id = req.query.resource_id as string | undefined;
  const company_id = req.user.company_id;
  const prices = resource_id
    ? await getResourceSupplierPricesByResourceIdServ(Number(resource_id), company_id)
    : await getAllResourceSupplierPricesServ(company_id);
  res.json(prices);
};
