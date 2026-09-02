import { Address } from './address';

export interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  category: string;
  is_active: boolean;
}

export interface SupplierWithAddresses extends Supplier {
  addresses: Address[];
}
