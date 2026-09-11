import {
  getResourcesForProjectFromDB,
  getProjectResourceByIdFromDB,
  getProjectResourceLinkFromDB,
  createProjectResourceInDB,
  deleteProjectResourceInDB,
  updateProjectResourceQuantityInDB
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

// quantity/unit_price are optional here for the manual "link a resource by
// hand" case (e.g. adding an unplanned resource to an in-progress project) -
// quantity defaults to 0 (nothing used yet), unit_price to the resource's
// current catalog price. The normal path, an accepted quote (see
// document.service.ts's acceptQuoteServ), always sets both explicitly from
// the quote's own lines and calls createProjectResourceInDB directly.
export const linkResourceToProjectServ = async (
  project_id: number,
  resource_id: number,
  company_id: number,
  quantity = 0,
  unit_price?: number
) => {
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

  return await createProjectResourceInDB({
    company_id,
    project_id,
    resource_id,
    quantity,
    unit_price: unit_price ?? resource.selling_price
  });
};

export const unlinkResourceFromProjectServ = async (id: number, company_id: number) => {
  const link = await getProjectResourceByIdFromDB(id, company_id);
  if (!link) {
    throw new NotFoundError("Project/resource link not found");
  }
  return await deleteProjectResourceInDB(id, company_id);
};

export const updateProjectResourceQuantityServ = async (id: number, company_id: number, quantity: number) => {
  const link = await getProjectResourceByIdFromDB(id, company_id);
  if (!link) {
    throw new NotFoundError("Project/resource link not found");
  }
  return await updateProjectResourceQuantityInDB(id, company_id, quantity);
};
