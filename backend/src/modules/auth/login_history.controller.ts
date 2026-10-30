import { Request, Response } from "express";
import { getLoginHistoryServ, getLoginHistoryUsersServ } from "./login_history.service";

export const getLoginHistory = async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const user_id = req.query.user_id ? Number(req.query.user_id) : undefined;
  const history = await getLoginHistoryServ(limit, user_id);
  res.json(history);
};

export const getLoginHistoryUsers = async (_req: Request, res: Response) => {
  const users = await getLoginHistoryUsersServ();
  res.json(users);
};
