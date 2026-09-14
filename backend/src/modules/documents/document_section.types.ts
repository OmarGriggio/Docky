export interface DocumentSection {
  id: number;

  company_id: number;
  document_id: number;

  position: number;
  title: string;
  description: string | null;
  // Optional schedule for this section's work (datetime, not just a date) -
  // null when not scheduled yet.
  date_start: Date | null;
  date_end: Date | null;

  is_active: boolean;
}
