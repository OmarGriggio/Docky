import { describe, it, expect } from 'vitest';
import { moveStartKeepingDuration, toDateInputValue, toTimeInputValue, withDatePart, withTimePart } from './note-time';

describe('note input values', () => {

  it('formats a local date and time the way native inputs expect', () => {
    const date = new Date(2026, 0, 5, 8, 7);
    expect(toDateInputValue(date)).toBe('2026-01-05');
    expect(toTimeInputValue(date)).toBe('08:07');
    expect(toDateInputValue(null)).toBe('');
    expect(toTimeInputValue(null)).toBe('');
  });

  it('replaces only the day, or only the time of day', () => {
    const date = new Date(2026, 9, 27, 8, 30);
    expect(withDatePart(date, '2026-11-02')).toEqual(new Date(2026, 10, 2, 8, 30));
    expect(withTimePart(date, '14:15')).toEqual(new Date(2026, 9, 27, 14, 15));
  });

  it('is null for a cleared or malformed input', () => {
    const date = new Date(2026, 9, 27, 8, 30);
    expect(withDatePart(date, '')).toBeNull();
    expect(withTimePart(date, '')).toBeNull();
    expect(withTimePart(date, 'abc')).toBeNull();
  });

});

describe('moveStartKeepingDuration', () => {

  it('moves the end along with the start', () => {
    const start = new Date(2026, 9, 27, 8, 0);
    const end = new Date(2026, 9, 27, 9, 30);
    const moved = moveStartKeepingDuration(start, end, new Date(2026, 9, 28, 14, 0));
    expect(moved.end).toEqual(new Date(2026, 9, 28, 15, 30));
  });

  it('never leaves the end before the start', () => {
    const start = new Date(2026, 9, 27, 9, 0);
    const end = new Date(2026, 9, 27, 8, 0);
    const moved = moveStartKeepingDuration(start, end, new Date(2026, 9, 27, 10, 0));
    expect(moved.end).toEqual(new Date(2026, 9, 27, 10, 0));
  });

});
