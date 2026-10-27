// The phone's note form (see calendar.html) edits a note's start and end as
// four native inputs - a date and a time each - which the browser hands back
// as plain strings ('2026-10-27', '08:30'), in local time. These convert
// between those strings and the Date the rest of the calendar works with.

const pad = (value: number) => String(value).padStart(2, '0');

export function toDateInputValue(date: Date | null): string {
  return date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : '';
}

export function toTimeInputValue(date: Date | null): string {
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '';
}

// A copy of `date` with only its day (value 'YYYY-MM-DD') or only its time
// of day (value 'HH:mm') replaced - null for a cleared or malformed input.
export function withDatePart(date: Date, value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const next = new Date(date);
  next.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return next;
}

export function withTimePart(date: Date, value: string): Date | null {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    return null;
  }
  const next = new Date(date);
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return next;
}

// Moving a note's start drags its end along, keeping the same duration -
// the way a phone's own calendar app behaves - so a start pushed past the
// end never leaves the note ending before it begins.
export function moveStartKeepingDuration(start: Date, end: Date, newStart: Date): { start: Date; end: Date } {
  const duration = Math.max(0, end.getTime() - start.getTime());
  return { start: newStart, end: new Date(newStart.getTime() + duration) };
}
