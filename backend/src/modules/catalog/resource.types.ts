export type ResourceType = "MATERIAL" | "SERVICE";

export interface Resource {
  id: number;

  company_id: number;
  parent_resource_id: number | null;

  type: ResourceType;
  // Generated on creation (MAT0001 / SER0001, see resource.service.ts) and
  // never changed afterwards.
  code: string;
  // Free text, optional - e.g. the supplier's own article number.
  reference: string | null;
  name: string;
  unit: string;

  selling_price: number;
  purchase_price: number | null;

  is_active: boolean;
}

// type/parent_resource_id/is_active each have their own dedicated flow and
// the code never changes - everything else can be edited this way (the
// resource list's own row editor).
export type UpdateResourceData = Pick<Resource, "reference" | "name" | "unit" | "selling_price" | "purchase_price">;
