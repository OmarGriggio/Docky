import { Request, Response } from "express";
import { getUnitsServ, addUnitServ, archiveUnitServ } from "./resource_unit.service";

export const getUnits = async (req: Request, res: Response) => {
  const includeArchived = req.query.includeArchived === "true";
  const units = await getUnitsServ(req.user.company_id, includeArchived);
  res.json(units);
};

export const createUnit = async (req: Request, res: Response) => {
  const { label }: { label: string } = req.body;

  const unit = await addUnitServ(label, req.user.company_id);
  res.json(unit);
};

export const archiveUnit = async (req: Request, res: Response) => {
  const unit = await archiveUnitServ(Number(req.params.id), req.user.company_id);
  res.json(unit);
};
