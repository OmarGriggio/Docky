import {
  getResourcesFromDB,
  getResourcesByTypeFromDB,
  getResourceByIdFromDB,
  getResourceByCodeFromDB,
  createResourceInDB,
  updateResourceInDB,
  archiveResourceInDB,
  unarchiveResourceInDB
} from "./resource.repository";
import { Resource, UpdateResourceData } from "./resource.types";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

export const getAllResourcesServ = async (company_id: number, includeArchived = false) => {
  return await getResourcesFromDB(company_id, includeArchived);
};

export const getResourcesByTypeServ = async (type: string, company_id: number, includeArchived = false) => {
  return await getResourcesByTypeFromDB(type, company_id, includeArchived);
};

export const addResourceServ = async (resourceData: Omit<Resource, "id" | "company_id" | "is_active">, company_id: number) => {
  const existingResource = await getResourceByCodeFromDB(resourceData.code, company_id);
  if (existingResource) {
    throw new ConflictError("Resource code already exists");
  }
  return await createResourceInDB({ ...resourceData, company_id, is_active: true });
};

export const updateResourceServ = async (id: number, company_id: number, data: UpdateResourceData) => {
  const resource = await getResourceByIdFromDB(id, company_id);
  if (!resource) {
    throw new NotFoundError("Resource not found");
  }

  // Same uniqueness rule as addResourceServ - only re-checked if the code
  // actually changed, and excluding this resource's own current row.
  if (data.code && data.code !== resource.code) {
    const existing = await getResourceByCodeFromDB(data.code, company_id);
    if (existing) {
      throw new ConflictError("Resource code already exists");
    }
  }

  return await updateResourceInDB(id, company_id, data);
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
