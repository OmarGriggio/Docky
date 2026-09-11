export type DocumentLineType = 'MATERIAL' | 'SERVICE';

export interface DocumentLine {
  id: number;
  company_id: number;
  document_id: number;
  section_id: number;
  // Position within its section, not the whole document.
  position: number;
  type: DocumentLineType;
  label: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  discount: number;
  // Which catalog resource this line was added from, if any (null for a
  // hand-typed line) - lets an accepted quote feed its project (see
  // document.service.ts on the backend).
  resource_id: number | null;
  is_active: boolean;
}
