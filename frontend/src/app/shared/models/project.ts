export interface ProjectType {
  id: number;
  label: string;
}

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
