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
  // The date_start, among this chantier's own sections, closest to right
  // now - see project.repository.ts's getProjectsFromDB on the backend for
  // how it's computed and used to order the list. null when none of the
  // chantier's sections has a date_start set yet.
  closest_section_date: string | null;
  // The number of the quote this chantier was accepted from - null for a
  // chantier with no such quote. See project.types.ts's own comment on the
  // backend.
  quote_number: string | null;
}

export interface CreateProjectPayload {
  client_id: number;
  project_type_id: number;
  name: string;
  note?: string | null;
}
