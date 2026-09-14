// Lifecycle of the actual work, separate from is_active (archiving). See the
// migration's comment on projects.status - COMPLETED unlocks invoicing.
export type ProjectStatus = "IN_PROGRESS" | "COMPLETED";

export interface Project {
  id: number;
  company_id: number;
  // The PROJECT-type document backing this chantier - its own
  // document_sections/document_lines are this project's resource ledger
  // (see document.service.ts's acceptQuoteServ and project.service.ts's
  // addProjectServ, which both create that document before this row).
  document_id: number;
  client_id: number | null;
  project_type_id: number | null;
  name: string;
  note: string | null;
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
}

// Only the chantier's own identity fields - client/status/document_id each
// have their own dedicated flow (or none at all: which client/document a
// project is for never changes once created).
export interface UpdateProjectData {
  name: string;
  project_type_id: number | null;
}
