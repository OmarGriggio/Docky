// Lifecycle of the actual work, separate from is_active (archiving). See the
// migration's comment on projects.status - COMPLETED unlocks invoicing.
export type ProjectStatus = "IN_PROGRESS" | "COMPLETED";

export interface Project {
  id: number;
  company_id: number;
  client_id: number | null;
  project_type_id: number | null;
  name: string;
  note: string | null;
  same_address_as_client: boolean;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  status: ProjectStatus;
  created_at: Date;
  is_active: boolean;
}

export interface ProjectWithType extends Omit<Project, "project_type_id"> {
  project_type: string | null;
}

export interface CreateProjectData {
  client_id?: number | null;
  project_type_id?: number | null;
  name: string;
  note?: string | null;
  same_address_as_client: boolean;
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}
