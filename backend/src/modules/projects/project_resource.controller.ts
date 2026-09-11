import { Request, Response } from "express";
import {
  getResourcesForProjectServ,
  linkResourceToProjectServ,
  unlinkResourceFromProjectServ,
  updateProjectResourceQuantityServ
} from "./project_resource.service";

export const getProjectResources = async (req: Request, res: Response) => {
  const project_id = Number(req.query.project_id);
  const resources = await getResourcesForProjectServ(project_id, req.user.company_id);
  res.json(resources);
};

export const createProjectResource = async (req: Request, res: Response) => {
  const { project_id, resource_id, quantity, unit_price } = req.body;
  const link = await linkResourceToProjectServ(project_id, resource_id, req.user.company_id, quantity, unit_price);
  res.json(link);
};

export const deleteProjectResource = async (req: Request, res: Response) => {
  const link = await unlinkResourceFromProjectServ(Number(req.params.id), req.user.company_id);
  res.json(link);
};

export const updateProjectResourceQuantity = async (req: Request, res: Response) => {
  const { quantity } = req.body;
  const link = await updateProjectResourceQuantityServ(Number(req.params.id), req.user.company_id, quantity);
  res.json(link);
};
