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
  is_active: boolean;
}
