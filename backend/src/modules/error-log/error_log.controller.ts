import { Request, Response } from "express";
import { getErrorGroupsServ, recordClientErrorServ, setErrorGroupResolvedServ } from "./error_log.service";

export const getErrorGroups = async (req: Request, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  res.json(await getErrorGroupsServ(status));
};

export const resolveErrorGroup = async (req: Request, res: Response) => {
  await setErrorGroupResolvedServ(Number(req.params.id), true);
  res.status(204).end();
};

export const reopenErrorGroup = async (req: Request, res: Response) => {
  await setErrorGroupResolvedServ(Number(req.params.id), false);
  res.status(204).end();
};

// Who ran into it comes from the token, never from the report itself.
export const recordClientError = async (req: Request, res: Response) => {
  await recordClientErrorServ(req.body, { location: null, company_id: req.user.company_id, user_id: req.user.userId });
  res.status(204).end();
};
