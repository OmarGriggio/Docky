import { Request, Response } from "express";
import {
  getAllProjectsServ,
  getProjectByIdServ,
  addProjectServ,
  updateProjectServ,
  archiveProjectServ,
  unarchiveProjectServ,
  completeProjectServ
} from "./project.service";
import { CreateProjectData, UpdateProjectData } from "./project.types";
import { addDepositInvoiceServ, getChantierBillingServ } from "../documents/document.service";

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

export const updateProject = async (req: Request, res: Response) => {
  const projectData: UpdateProjectData = req.body;

  const projectUpdated = await updateProjectServ(Number(req.params.id), req.user.company_id, projectData);
  res.json(projectUpdated);
};

export const archiveProject = async (req: Request, res: Response) => {
  const projectArchived = await archiveProjectServ(Number(req.params.id), req.user.company_id);
  res.json(projectArchived);
};

export const unarchiveProject = async (req: Request, res: Response) => {
  const projectUnarchived = await unarchiveProjectServ(Number(req.params.id), req.user.company_id);
  res.json(projectUnarchived);
};

export const completeProject = async (req: Request, res: Response) => {
  const projectCompleted = await completeProjectServ(Number(req.params.id), req.user.company_id);
  res.json(projectCompleted);
};

export const getProjectBilling = async (req: Request, res: Response) => {
  res.json(await getChantierBillingServ(Number(req.params.id), req.user.company_id));
};

export const createDepositInvoice = async (req: Request, res: Response) => {
  res.json(await addDepositInvoiceServ(Number(req.params.id), req.user.company_id, req.body));
};
