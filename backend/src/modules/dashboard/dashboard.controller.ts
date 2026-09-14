import { Request, Response } from "express";
import { getPaidAmountByClientServ } from "./dashboard.service";

export const getPaidAmountByClient = async (req: Request, res: Response) => {
  const result = await getPaidAmountByClientServ(req.user.company_id);
  res.json(result);
};
