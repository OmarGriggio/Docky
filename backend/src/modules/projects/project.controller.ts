import { Request, Response } from "express";
import {
  getAllProjectsServ,
  getProjectByIdServ,
  addProjectServ,
  archiveProjectServ,
  unarchiveProjectServ
} from "./project.service";
import { CreateProjectData } from "./project.types";

export const getProjects = async (req: Request, res: Response) => {
  const includeArchived = req.query.includeArchived === "true";
  const projects = await getAllProjectsServ(req.user.company_id, includeArchived);
  res.json(projects);
};

export const getProjectById = async (req: Request, res: Response) => {
  const project = await getProjectByIdServ(Number(req.params.id), req.user.company_id);
  res.json(project);
};

export const createProject = async (req: Request, res: Response) => {
  const projectData: CreateProjectData = req.body;

  const projectCreated = await addProjectServ(projectData, req.user.company_id);
  res.json(projectCreated);
};

export const archiveProject = async (req: Request, res: Response) => {
  const projectArchived = await archiveProjectServ(Number(req.params.id), req.user.company_id);
  res.json(projectArchived);
};

export const unarchiveProject = async (req: Request, res: Response) => {
  const projectUnarchived = await unarchiveProjectServ(Number(req.params.id), req.user.company_id);
  res.json(projectUnarchived);
};
