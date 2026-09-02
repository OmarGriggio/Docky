export type ResourceType = "MATERIAL" | "LABOR" | "SUBCONTRACTING" | "OTHER";

export interface Resource {
  id: number;

  company_id: number;
  parent_resource_id: number | null;

  type: ResourceType;
  code: string;
  name: string;
  unit: string;

  selling_price: number;
  purchase_price: number | null;

  is_active: boolean;
}
