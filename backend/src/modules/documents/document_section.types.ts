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

// Only the schedule is editable this way for now - title/description/
// position/is_active each have their own dedicated flow already (created
// once via POST, archived/unarchived, or replaced wholesale by the
// caller's own archive-and-recreate pattern - see document-form.ts and
// project-resources.ts on the frontend).
export type UpdateDocumentSectionData = Pick<DocumentSection, "date_start" | "date_end">;

// A section joined with its own chantier's identity - project_id/
// project_name aren't real columns, purely so the calendar (calendar.ts on
// the frontend) can show/label which chantier each one belongs to, whether
// still unscheduled (getUnscheduledSectionsFromDB) or already on the
// calendar (getScheduledSectionsFromDB).
export interface SectionWithProject extends DocumentSection {
  project_id: number;
  project_name: string;
}
