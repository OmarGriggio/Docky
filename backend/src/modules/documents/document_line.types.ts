// MATERIAL/SERVICE are priced lines. SECTION (a grouping title) and NOTE
// (free text) are presentation-only — see document_lines in
// zz_migrations/000_base.sql: quantity/unit_price stay null for them, and
// they're skipped by computeDocumentTotals. There's no section_id/hierarchy -
// a SECTION line just visually groups every line after it (in `position`
// order) up to the next SECTION line.
export type DocumentLineType = "MATERIAL" | "SERVICE" | "SECTION" | "NOTE";

export interface DocumentLine {
  id: number;

  company_id: number;
  document_id: number;

  position: number;
  type: DocumentLineType;

  label: string;

  quantity: number | null;
  unit: string | null;

  unit_price: number | null;

  discount: number;

  is_active: boolean;
}
