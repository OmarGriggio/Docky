import {
  getResourcesFromDB,
  getResourcesByTypeFromDB,
  getResourceByIdFromDB,
  getResourceByCodeFromDB,
  createResourceInDB,
  updateResourceInDB,
  archiveResourceInDB,
  unarchiveResourceInDB,
  lockResourceCodingInDB
} from "./resource.repository";
import { Resource, ResourceType, UpdateResourceData } from "./resource.types";
import { NotFoundError, ConflictError, AppError } from "../../shared/types/errors";
import { withTransaction } from "../../shared/config/database";
import { nextNumberServ } from "../numbering/numbering.service";

const RESOURCE_TYPES: ResourceType[] = ["MATERIAL", "SERVICE"];

const REFERENCE_MAX_LENGTH = 50;

// Optional free text - an empty one stored as null.
const normalizeReference = (reference: unknown): string | null => {
  if (reference !== null && reference !== undefined && typeof reference !== "string") {
    throw new AppError("reference must be text", 400);
  }
  const value = reference?.trim() || null;
  if (value !== null && value.length > REFERENCE_MAX_LENGTH) {
    throw new AppError(`reference must be ${REFERENCE_MAX_LENGTH} characters or fewer`, 400);
  }
  return value;
};

export const getAllResourcesServ = async (company_id: number, includeArchived = false) => {
  return await getResourcesFromDB(company_id, includeArchived);
};

export const getResourcesByTypeServ = async (type: string, company_id: number, includeArchived = false) => {
  return await getResourcesByTypeFromDB(type, company_id, includeArchived);
};

// The code is generated, in the company's format for the resource's type
// (Paramètres > Numérotation - MAT0001 for a material, SER0001 for a service
// by default), whatever the request says. Never reused, archived resources
// included, so it never collides with an active one either.
// `keepPrices` (an employee who may not see prices): created unpriced - 0,
// no purchase price - for an admin to price; an edit keeps the stored ones.
export const addResourceServ = async (resourceData: Omit<Resource, "id" | "company_id" | "is_active" | "code">, company_id: number, { keepPrices = false } = {}) => {
  if (keepPrices) {
    resourceData = { ...resourceData, selling_price: 0, purchase_price: null };
  }
  if (!RESOURCE_TYPES.includes(resourceData.type)) {
    throw new AppError("type must be MATERIAL or SERVICE", 400);
  }
  if (resourceData.parent_resource_id != null && !(await getResourceByIdFromDB(resourceData.parent_resource_id, company_id))) {
    throw new NotFoundError("Parent resource not found");
  }
  // A supplier's article number - a material's only, a service has none.
  const reference = resourceData.type === "MATERIAL" ? normalizeReference(resourceData.reference) : null;

  return await withTransaction(async () => {
    await lockResourceCodingInDB(company_id);
    const code = await nextNumberServ(company_id, resourceData.type);
    return await createResourceInDB({ ...resourceData, code, reference, company_id, is_active: true });
  });
};

export const updateResourceServ = async (id: number, company_id: number, data: UpdateResourceData, { keepPrices = false } = {}) => {
  const resource = await getResourceByIdFromDB(id, company_id);
  if (!resource) {
    throw new NotFoundError("Resource not found");
  }
  if (keepPrices) {
    data = { ...data, selling_price: resource.selling_price, purchase_price: resource.purchase_price };
  }

  const reference = resource.type === "MATERIAL" ? normalizeReference(data.reference) : null;
  return await updateResourceInDB(id, company_id, { ...data, reference });
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

  // Its code may have been reused by a new active resource while it was
  // archived (see zz_migrations/000_base.sql) - restoring it would now collide.
  if (resource.code && await getResourceByCodeFromDB(resource.code, company_id)) {
    throw new ConflictError("Resource code already exists");
  }
  return await unarchiveResourceInDB(id, company_id);
};
