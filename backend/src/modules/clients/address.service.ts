import { Address, UpdateAddressData } from "./address.types";
import {
  getAddressesFromDB,
  getAddressesByClientIdFromDB,
  getAddressByIdFromDB,
  unsetPrimaryForClientInDB,
  createAddressInDB,
  updateAddressInDB,
  deleteAddressInDB
} from "./address.repository";
import { getClientByIdFromDB } from "./client.repository";
import { NotFoundError } from "../../shared/types/errors";

export const getAllAddressesServ = async (company_id: number) => {
  return await getAddressesFromDB(company_id);
};

// The first address added for a client automatically becomes "primary"
// (there has to be one). Marking a later one as primary demotes whichever
// one was primary before it, so there's always at most one.
export const addAddressServ = async (addressData: Omit<Address, "id" | "company_id">, company_id: number) => {
  const client = await getClientByIdFromDB(addressData.client_id, company_id);
  if (!client) {
    throw new NotFoundError("Client not found");
  }

  const existing = await getAddressesByClientIdFromDB(addressData.client_id);
  const isFirstAddress = existing.length === 0;
  const is_primary = isFirstAddress || addressData.is_primary;

  if (is_primary && !isFirstAddress) {
    await unsetPrimaryForClientInDB(addressData.client_id, company_id);
  }

  return await createAddressInDB({ ...addressData, is_primary, company_id });
};

export const updateAddressServ = async (id: number, company_id: number, data: UpdateAddressData) => {
  const address = await getAddressByIdFromDB(id, company_id);
  if (!address) {
    throw new NotFoundError("Address not found");
  }
  return await updateAddressInDB(id, company_id, data);
};

// Addresses are a sub-detail of a client, not a business record on their own
// (unlike clients/documents/etc.) - a real DELETE, no archive here. Deleting
// the "primary" address doesn't auto-promote another one; the client is
// simply left with none until someone adds/marks a new one.
export const deleteAddressServ = async (id: number, company_id: number) => {
  const address = await getAddressByIdFromDB(id, company_id);
  if (!address) {
    throw new NotFoundError("Address not found");
  }
  return await deleteAddressInDB(id, company_id);
};
