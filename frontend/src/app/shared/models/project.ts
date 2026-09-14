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
  // The PROJECT-type document backing this chantier - its own
  // document_sections/document_lines (fetched via document-section.service.ts/
  // document-line.service.ts) are this project's resource ledger. Also
  // carries this chantier's own address (address_id) - not duplicated here.
  document_id: number;
  client_id: number;
  project_type_id: number | null;
  project_type: string;
  name: string;
  note: string | null;
  status: ProjectStatus;
  created_at: string;
  is_active: boolean;
}

export interface CreateProjectPayload {
  client_id: number;
  project_type_id: number;
  name: string;
  note?: string | null;
}
