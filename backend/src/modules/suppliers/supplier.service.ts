import { getSuppliersFromDB, getSupplierByCode, getSupplierByIdFromDB, createSupplierInDB, archiveSupplierInDB, unarchiveSupplierInDB } from "./supplier.repository";
import { getAddressesBySupplierIdFromDB } from "../clients/address.repository";
import { Supplier, SupplierWithAddresses } from "./supplier.types";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

export const getAllSuppliersServ = async (company_id: number, includeArchived = false) => {
  return await getSuppliersFromDB(company_id, includeArchived);
};

export const getSupplierByIdServ = async (id: number, company_id: number): Promise<SupplierWithAddresses> => {
  const supplier = await getSupplierByIdFromDB(id, company_id);
  if (!supplier) {
    throw new NotFoundError("Supplier not found");
  }

  const addresses = await getAddressesBySupplierIdFromDB(id);
  return { ...supplier, addresses };
};

export const addSupplierServ = async (supplierData: Omit<Supplier, "id" | "company_id">, company_id: number) => {
  const existingSupplier = await getSupplierByCode(supplierData.supplier_code);
  if (existingSupplier) {
    throw new ConflictError("Supplier code already exists");
  }
  return await createSupplierInDB({ ...supplierData, company_id });
};

export const archiveSupplierServ = async (id: number, company_id: number) => {
  const supplier = await getSupplierByIdFromDB(id, company_id);
  if (!supplier) {
    throw new NotFoundError("Supplier not found");
  }
  return await archiveSupplierInDB(id, company_id);
};

export const unarchiveSupplierServ = async (id: number, company_id: number) => {
  const supplier = await getSupplierByIdFromDB(id, company_id);
  if (!supplier) {
    throw new NotFoundError("Supplier not found");
  }
  return await unarchiveSupplierInDB(id, company_id);
};
