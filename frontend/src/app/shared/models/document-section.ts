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
  // Free-form note a user can jot on a section from wherever it shows up
  // (starting with the calendar dialog) - distinct from description, which
  // is set once when the section is created. Edited through its own PATCH
  // (see DocumentSectionService.updateSectionNote), not the general PUT.
  note: string | null;
  is_active: boolean;
}

// A section joined with its own chantier's identity - project_id/
// project_name aren't real columns, purely so the calendar (calendar.ts)
// can show/label which chantier each one belongs to, whether still
// unscheduled (DocumentSectionService.getUnscheduledSections) or already on
// the calendar (getScheduledSections).
export interface SectionWithProject extends DocumentSection {
  project_id: number;
  project_name: string;
}
