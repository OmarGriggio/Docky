export interface ProjectResource {
  id: number;
  company_id: number;
  project_id: number;
  resource_id: number;
  // The real, adjustable amount used on site - see the migration's comment
  // on project_resources.quantity/unit_price.
  quantity: number;
  unit_price: number | null;
}
