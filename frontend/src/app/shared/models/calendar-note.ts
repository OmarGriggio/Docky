// A free-standing calendar entry (title/description/date_start/date_end),
// not tied to a chantier/section - see backend's calendar_note.types.ts.
export interface CalendarNote {
  id: number;
  title: string;
  description: string | null;
  date_start: string;
  date_end: string;
}

export type CalendarNoteData = Omit<CalendarNote, 'id'>;
