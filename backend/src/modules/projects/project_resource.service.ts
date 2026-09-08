import {
  getResourcesForProjectFromDB,
  getProjectResourceByIdFromDB,
  getProjectResourceLinkFromDB,
  createProjectResourceInDB,
  deleteProjectResourceInDB
} from "./project_resource.repository";
import { getProjectByIdFromDB } from "./project.repository";
import { getResourceByIdFromDB } from "../catalog/resource.repository";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

export const getResourcesForProjectServ = async (project_id: number, company_id: number) => {
  const project = await getProjectByIdFromDB(project_id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  return await getResourcesForProjectFromDB(project_id, company_id);
};

export const linkResourceToProjectServ = async (project_id: number, resource_id: number, company_id: number) => {
  const project = await getProjectByIdFromDB(project_id, company_id);
  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const resource = await getResourceByIdFromDB(resource_id, company_id);
  if (!resource) {
    throw new NotFoundError("Resource not found");
  }

  const existingLink = await getProjectResourceLinkFromDB(project_id, resource_id, company_id);
  if (existingLink) {
    throw new ConflictError("This resource is already linked to this project");
  }

  return await createProjectResourceInDB({ company_id, project_id, resource_id });
};

export const unlinkResourceFromProjectServ = async (id: number, company_id: number) => {
  const link = await getProjectResourceByIdFromDB(id, company_id);
  if (!link) {
    throw new NotFoundError("Project/resource link not found");
  }
  return await deleteProjectResourceInDB(id, company_id);
};
