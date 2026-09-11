export interface ProjectResource {
  id: number;
  company_id: number;
  project_id: number;
  resource_id: number;
  // The real, adjustable amount used on site - starts as a copy of the
  // accepted quote's line quantity, corrected by hand as the project runs
  // (e.g. more hours than planned). unit_price is frozen at that same
  // moment, not re-read from the resource's current catalog price.
  quantity: number;
  unit_price: number | null;
}
