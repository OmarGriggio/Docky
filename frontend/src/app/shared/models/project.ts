export interface ProjectType {
  id: number;
  label: string;
}

// Lifecycle of the actual work, separate from is_active (archiving) - an
// invoice can only be created from a COMPLETED project (see
// document-form.ts) since its real, adjusted quantities aren't final until
// then. One-way: no "reopen" once closed.
export type ProjectStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface Project {
  id: number;
  client_id: number;
  project_type: string;
  name: string;
  note: string | null;
  same_address_as_client: boolean;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  status: ProjectStatus;
  created_at: string;
  is_active: boolean;
}

export interface CreateProjectPayload {
  client_id: number;
  project_type_id: number;
  name: string;
  note?: string | null;
  same_address_as_client: boolean;
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}
