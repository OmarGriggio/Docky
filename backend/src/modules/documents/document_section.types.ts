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
