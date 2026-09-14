export interface DocumentSection {
  id: number;
  company_id: number;
  document_id: number;
  position: number;
  title: string;
  description: string | null;
  // Optional schedule for this section's work - null when not scheduled yet.
  date_start: string | null;
  date_end: string | null;
  is_active: boolean;
}
