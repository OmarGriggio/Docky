export interface ResourceSupplierPrice {
  id: number;

  company_id: number;
  resource_id: number;
  supplier_id: number;

  purchase_price: number;
  discount: number;
  delivery_time: number;
  is_default: boolean;
}
