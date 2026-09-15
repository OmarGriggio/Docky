import { Request, Response } from "express";
import { getLoginHistoryServ } from "./login_history.service";

export const getLoginHistory = async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const history = await getLoginHistoryServ(limit);
  res.json(history);
};
