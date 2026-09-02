import {
  getResourceSupplierPricesFromDB,
  getResourceSupplierPricesByResourceIdFromDB
} from "./resource_supplier_price.repository";

export const getAllResourceSupplierPricesServ = async (company_id: number) => {
  return await getResourceSupplierPricesFromDB(company_id);
};

export const getResourceSupplierPricesByResourceIdServ = async (resource_id: number, company_id: number) => {
  return await getResourceSupplierPricesByResourceIdFromDB(resource_id, company_id);
};
