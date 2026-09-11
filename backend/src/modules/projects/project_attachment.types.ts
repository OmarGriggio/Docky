export interface ProjectAttachment {
  id: number;

  company_id: number;
  project_id: number;
  uploaded_by: number | null;

  filename: string;
  mime_type: string;
  size_bytes: number;

  created_at: string;
  is_active: boolean;
}
