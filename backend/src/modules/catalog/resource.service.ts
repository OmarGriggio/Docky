import { getResourcesFromDB, getResourcesByTypeFromDB, getResourceByIdFromDB, archiveResourceInDB, unarchiveResourceInDB } from "./resource.repository";
import { NotFoundError } from "../../shared/types/errors";

export const getAllResourcesServ = async (company_id: number, includeArchived = false) => {
  return await getResourcesFromDB(company_id, includeArchived);
};

export const getResourcesByTypeServ = async (type: string, company_id: number, includeArchived = false) => {
  return await getResourcesByTypeFromDB(type, company_id, includeArchived);
};

export const archiveResourceServ = async (id: number, company_id: number) => {
  const resource = await getResourceByIdFromDB(id, company_id);
  if (!resource) {
    throw new NotFoundError("Resource not found");
  }
  return await archiveResourceInDB(id, company_id);
};

export const unarchiveResourceServ = async (id: number, company_id: number) => {
  const resource = await getResourceByIdFromDB(id, company_id);
  if (!resource) {
    throw new NotFoundError("Resource not found");
  }
  return await unarchiveResourceInDB(id, company_id);
};
