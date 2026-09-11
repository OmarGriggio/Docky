// Both are priced - MATERIAL uses quantity+unit for a physical amount (e.g.
// "20 Sac"), SERVICE uses quantity+unit for time (e.g. "5 Heure"). Grouping
// (formerly a SECTION marker line) is now a real document_sections row -
// see the "Flexible document lines" entry in zz_docs/Decisions.md.
export type DocumentLineType = "MATERIAL" | "SERVICE";

export interface DocumentLine {
  id: number;

  company_id: number;
  document_id: number;
  section_id: number;

  // Position within its section, not the whole document - section ordering
  // itself is document_sections.position.
  position: number;
  type: DocumentLineType;

  label: string;

  quantity: number;
  unit: string | null;

  unit_price: number;

  discount: number;

  // Which catalog resource this line was added from, if any (null for a
  // hand-typed line) - kept so an accepted quote's lines can be turned into
  // project_resources rows (see document.service.ts's acceptQuoteServ).
  resource_id: number | null;

  is_active: boolean;
}
