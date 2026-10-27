import { Request, Response } from "express";
import { getOpenInvoicesServ, getPaidAmountByClientServ, getProjectsInProgressServ } from "./dashboard.service";

export const getPaidAmountByClient = async (req: Request, res: Response) => {
  const result = await getPaidAmountByClientServ(req.user.company_id);
  res.json(result);
};

export const getOpenInvoices = async (req: Request, res: Response) => {
  const result = await getOpenInvoicesServ(req.user.company_id);
  res.json(result);
};

export const getProjectsInProgress = async (req: Request, res: Response) => {
  const result = await getProjectsInProgressServ(req.user.company_id);
  res.json(result);
};
