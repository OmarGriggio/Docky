import { Request, Response } from "express";
import {
  getResourcesForProjectServ,
  linkResourceToProjectServ,
  unlinkResourceFromProjectServ
} from "./project_resource.service";

export const getProjectResources = async (req: Request, res: Response) => {
  const project_id = Number(req.query.project_id);
  const resources = await getResourcesForProjectServ(project_id, req.user.company_id);
  res.json(resources);
};

export const createProjectResource = async (req: Request, res: Response) => {
  const { project_id, resource_id } = req.body;
  const link = await linkResourceToProjectServ(project_id, resource_id, req.user.company_id);
  res.json(link);
};

export const deleteProjectResource = async (req: Request, res: Response) => {
  const link = await unlinkResourceFromProjectServ(Number(req.params.id), req.user.company_id);
  res.json(link);
};
