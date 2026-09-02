import { Request, Response } from "express";
import {
  getAllProjectTypesServ,
  getProjectTypeByIdServ,
  addProjectTypeServ,
  deleteProjectTypeServ
} from "./project_type.service";
import { CreateProjectTypeData } from "./project_type.types";

export const getProjectTypes = async (req: Request, res: Response) => {
  const projectTypes = await getAllProjectTypesServ();
  res.json(projectTypes);
};

export const getProjectTypeById = async (req: Request, res: Response) => {
  const projectType = await getProjectTypeByIdServ(Number(req.params.id));
  res.json(projectType);
};

export const createProjectType = async (req: Request, res: Response) => {
  const projectTypeData: CreateProjectTypeData = req.body;

  const projectTypeCreated = await addProjectTypeServ(projectTypeData);
  res.json(projectTypeCreated);
};

export const deleteProjectType = async (req: Request, res: Response) => {
  const projectTypeDeleted = await deleteProjectTypeServ(Number(req.params.id));
  res.json(projectTypeDeleted);
};
