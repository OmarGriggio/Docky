export interface DocumentSection {
  id: number;

  company_id: number;
  document_id: number;

  position: number;
  title: string;
  description: string | null;

  is_active: boolean;
}
