// An invoice's service date or period (art. 26 LTVA) prefilled from a
// chantier: its sections' planned dates, from the earliest start to the
// latest end (a section with only one of them counts it for both). Days
// only, in local time; one day is a single date (no end). Nothing planned:
// no period.
export const servicePeriodOfSections = (
  sections: { date_start: string | null; date_end: string | null }[]
): { start: Date | null; end: Date | null } => {
  const days = sections.flatMap(section => {
    const start = section.date_start ?? section.date_end;
    const end = section.date_end ?? section.date_start;
    return start && end ? [{ start: dayOf(start), end: dayOf(end) }] : [];
  });
  if (days.length === 0) {
    return { start: null, end: null };
  }
  const start = new Date(Math.min(...days.map(day => day.start.getTime())));
  const end = new Date(Math.max(...days.map(day => day.end.getTime(), start.getTime())));
  return { start, end: end.getTime() === start.getTime() ? null : end };
};

const dayOf = (value: string): Date => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};
