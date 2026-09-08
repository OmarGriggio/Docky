import { Request, Response } from "express";
import { getAllResourcesServ, getResourcesByTypeServ, addResourceServ, archiveResourceServ, unarchiveResourceServ } from "./resource.service";
import { Resource } from "./resource.types";

export const getResources = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const company_id = req.user.company_id;
  const includeArchived = req.query.includeArchived === "true";
  const resources = type
    ? await getResourcesByTypeServ(type, company_id, includeArchived)
    : await getAllResourcesServ(company_id, includeArchived);
  res.json(resources);
};

export const createResource = async (req: Request, res: Response) => {
  const resourceData: Omit<Resource, "id" | "company_id" | "is_active"> = req.body;

  const resourceCreated = await addResourceServ(resourceData, req.user.company_id);
  res.json(resourceCreated);
};

export const archiveResource = async (req: Request, res: Response) => {
  const resourceArchived = await archiveResourceServ(Number(req.params.id), req.user.company_id);
  res.json(resourceArchived);
};

export const unarchiveResource = async (req: Request, res: Response) => {
  const resourceUnarchived = await unarchiveResourceServ(Number(req.params.id), req.user.company_id);
  res.json(resourceUnarchived);
};
