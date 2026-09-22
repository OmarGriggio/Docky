// A free-standing calendar entry, not tied to a chantier/section (unlike
// document_sections, which the calendar also shows - see calendar.ts on the
// frontend). Real DELETE, not archived: this is a lightweight note, not a
// business record (see CLAUDE.md's "Archive instead of delete").
export interface CalendarNote {
  id: number;

  company_id: number;

  title: string;
  description: string | null;
  date_start: Date;
  date_end: Date;
}

export type CreateCalendarNoteData = Omit<CalendarNote, "id" | "company_id">;

export type UpdateCalendarNoteData = Omit<CalendarNote, "id" | "company_id">;
