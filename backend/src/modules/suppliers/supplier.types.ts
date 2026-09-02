import { Address } from "../clients/address.types";

export type Supplier = {
  id: number;
  company_id: number;
  supplier_code: string;
  name: string;
  category: string;
  is_active: boolean;
};

export interface SupplierWithAddresses extends Supplier {
  addresses: Address[];
}
