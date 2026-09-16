export type ResourceType = "MATERIAL" | "SERVICE";

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

// type/parent_resource_id/is_active each have their own dedicated flow -
// everything else can be edited this way (the resource list's own
// cell-editable columns).
export type UpdateResourceData = Pick<Resource, "code" | "name" | "unit" | "selling_price" | "purchase_price">;
