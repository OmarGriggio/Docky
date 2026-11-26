import { describe, expect, it } from 'vitest';
import { servicePeriodOfSections } from './service-period';

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);

describe('servicePeriodOfSections', () => {
  it('runs from the earliest start to the latest end', () => {
    expect(servicePeriodOfSections([
      { date_start: '2026-10-12T07:00:00', date_end: '2026-10-14T17:00:00' },
      { date_start: '2026-10-05T07:00:00', date_end: '2026-10-06T12:00:00' },
      { date_start: null, date_end: null },
    ])).toEqual({ start: day(2026, 10, 5), end: day(2026, 10, 14) });
  });

  it('reads an all-day end at midnight as the day before, like the calendar shows it', () => {
    // Stretched on the calendar over Monday 5 to Wednesday 7 October.
    expect(servicePeriodOfSections([{ date_start: '2026-10-05T00:00:00', date_end: '2026-10-08T00:00:00' }]))
      .toEqual({ start: day(2026, 10, 5), end: day(2026, 10, 7) });
    // One day, stretched: ends at midnight the next day.
    expect(servicePeriodOfSections([{ date_start: '2026-10-05T00:00:00', date_end: '2026-10-06T00:00:00' }]))
      .toEqual({ start: day(2026, 10, 5), end: null });
    // Dropped on one day: starts and ends at the same midnight.
    expect(servicePeriodOfSections([{ date_start: '2026-10-05T00:00:00', date_end: '2026-10-05T00:00:00' }]))
      .toEqual({ start: day(2026, 10, 5), end: null });
  });

  it('never ends before it starts, whatever a section says', () => {
    expect(servicePeriodOfSections([{ date_start: '2026-10-12T07:00:00', date_end: '2026-10-09T17:00:00' }]))
      .toEqual({ start: day(2026, 10, 12), end: null });
  });

  it('counts a section with one date for both', () => {
    expect(servicePeriodOfSections([
      { date_start: '2026-10-05T07:00:00', date_end: null },
      { date_start: null, date_end: '2026-10-20T07:00:00' },
    ])).toEqual({ start: day(2026, 10, 5), end: day(2026, 10, 20) });
  });

  it('gives one day as a single date, and nothing planned no period', () => {
    expect(servicePeriodOfSections([{ date_start: '2026-10-05T07:00:00', date_end: '2026-10-05T17:00:00' }]))
      .toEqual({ start: day(2026, 10, 5), end: null });
    expect(servicePeriodOfSections([{ date_start: null, date_end: null }])).toEqual({ start: null, end: null });
    expect(servicePeriodOfSections([])).toEqual({ start: null, end: null });
  });
});
