import { Address } from "./address.types";
import {
  getAddressesFromDB,
  getAddressesByClientIdFromDB,
  getAddressesBySupplierIdFromDB,
  getAddressByIdFromDB,
  unsetPrimaryForClientInDB,
  unsetPrimaryForSupplierInDB,
  createAddressInDB,
  deleteAddressInDB
} from "./address.repository";
import { getClientByIdFromDB } from "./client.repository";
import { getSupplierByIdFromDB } from "../suppliers/supplier.repository";
import { NotFoundError, ConflictError } from "../../shared/types/errors";

export const getAllAddressesServ = async (company_id: number) => {
  return await getAddressesFromDB(company_id);
};

// An address belongs to exactly one of client / supplier — never both, never
// neither. The first address added for a given client/supplier automatically
// becomes "primary" (there has to be one). Marking a later one as primary
// demotes whichever one was primary before it, so there's always at most one.
export const addAddressServ = async (addressData: Omit<Address, "id" | "company_id">, company_id: number) => {
  const hasClient = addressData.client_id !== null;
  const hasSupplier = addressData.supplier_id !== null;

  if (hasClient === hasSupplier) {
    throw new ConflictError("An address must belong to exactly one client or supplier");
  }

  let existing: unknown[];

  if (hasClient) {
    const client = await getClientByIdFromDB(addressData.client_id!, company_id);
    if (!client) {
      throw new NotFoundError("Client not found");
    }
    existing = await getAddressesByClientIdFromDB(addressData.client_id!);
  } else {
    const supplier = await getSupplierByIdFromDB(addressData.supplier_id!, company_id);
    if (!supplier) {
      throw new NotFoundError("Supplier not found");
    }
    existing = await getAddressesBySupplierIdFromDB(addressData.supplier_id!);
  }

  const isFirstAddress = existing.length === 0;
  const is_primary = isFirstAddress || addressData.is_primary;

  if (is_primary && !isFirstAddress) {
    if (hasClient) {
      await unsetPrimaryForClientInDB(addressData.client_id!, company_id);
    } else {
      await unsetPrimaryForSupplierInDB(addressData.supplier_id!, company_id);
    }
  }

  return await createAddressInDB({ ...addressData, is_primary, company_id });
};

// Addresses are a sub-detail of a client/supplier, not a business record on their
// own (unlike clients/documents/etc.) — a real DELETE, no archive here. Deleting
// the "primary" address doesn't auto-promote another one; the client/supplier is
// simply left with none until someone adds/marks a new one.
export const deleteAddressServ = async (id: number, company_id: number) => {
  const address = await getAddressByIdFromDB(id, company_id);
  if (!address) {
    throw new NotFoundError("Address not found");
  }
  return await deleteAddressInDB(id, company_id);
};
