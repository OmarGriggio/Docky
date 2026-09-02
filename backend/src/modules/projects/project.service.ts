import {
  getProjectsFromDB,
  getProjectByIdFromDB,
  createProjectInDB,
  archiveProjectInDB,
  unarchiveProjectInDB
} from "./project.repository";
import { CreateProjectData } from "./project.types";
import { NotFoundError } from "../../shared/types/errors";

export const getAllProjectsServ = async (company_id: number, includeArchived = false) => {
  return await getProjectsFromDB(company_id, includeArchived);
};

export const getProjectByIdServ = async (id: number, company_id: number) => {
  const project = await getProjectByIdFromDB(id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  return project;
};

export const addProjectServ = async (projectData: CreateProjectData, company_id: number) => {
  return await createProjectInDB({ ...projectData, company_id });
};

export const archiveProjectServ = async (id: number, company_id: number) => {
  const project = await getProjectByIdFromDB(id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  return await archiveProjectInDB(id, company_id);
};

export const unarchiveProjectServ = async (id: number, company_id: number) => {
  const project = await getProjectByIdFromDB(id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  return await unarchiveProjectInDB(id, company_id);
};
