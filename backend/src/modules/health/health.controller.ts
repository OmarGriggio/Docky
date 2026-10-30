import { Request, Response } from "express";
import { getHealthServ } from "./health.service";

// 503 when a dependency is down, so an uptime monitor (see zz_docs/Deployment.md)
// alerts on the status code alone. Only "ok"/"error" per check - no error
// message, this route is public.
export const getHealth = async (_req: Request, res: Response) => {
  const report = await getHealthServ();
  res.status(report.status === "ok" ? 200 : 503).json(report);
};
