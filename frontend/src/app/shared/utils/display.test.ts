import { describe, it, expect } from 'vitest';
import { clientDisplayName, archiveActionLabel, formatFileSize, calendarDateFromIso, calendarDateToIso, addressLabel } from './display';

describe('clientDisplayName', () => {

  it('uses the company_name when the client is a professional', () => {
    const client = { company_name: 'ABC Construction SA', first_name: null, last_name: null };
    expect(clientDisplayName(client)).toBe('ABC Construction SA');
  });

  it('falls back to first_name + last_name when there is no company_name', () => {
    const client = { company_name: null, first_name: 'Jean', last_name: 'Dupont' };
    expect(clientDisplayName(client)).toBe('Jean Dupont');
  });

  it('does not leave a stray space when only last_name is set', () => {
    const client = { company_name: null, first_name: null, last_name: 'Dupont' };
    expect(clientDisplayName(client)).toBe('Dupont');
  });

});

describe('archiveActionLabel', () => {

  it('returns Archiver for an active client', () => {
    expect(archiveActionLabel(true)).toBe('Archiver');
  });

  it('returns Restaurer for an archived supplier', () => {
    expect(archiveActionLabel(false)).toBe('Restaurer');
  });

});

describe('formatFileSize', () => {

  it('shows bytes under 1 Ko', () => {
    expect(formatFileSize(512)).toBe('512 o');
  });

  it('shows Ko between 1 Ko and 1 Mo', () => {
    expect(formatFileSize(2048)).toBe('2.0 Ko');
  });

  it('shows Mo from 1 Mo up', () => {
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 Mo');
  });

});

describe('addressLabel', () => {

  it('prefixes with "Attention : " when set', () => {
    const address = { attention: 'Réception', street: 'Rue du Lac 5', postal_code: '1000', city: 'Lausanne' };
    expect(addressLabel(address)).toBe('Réception : Rue du Lac 5, 1000 Lausanne');
  });

  it('omits the prefix when there is no attention', () => {
    const address = { attention: null, street: 'Rue du Lac 5', postal_code: '1000', city: 'Lausanne' };
    expect(addressLabel(address)).toBe('Rue du Lac 5, 1000 Lausanne');
  });

});

describe('calendarDateFromIso', () => {

  it('reads the calendar date from the ISO string\'s UTC components, not the local ones', () => {
    // Shaped like a real stored value (seed data uses this exact shape) -
    // 22:00 UTC, i.e. local midnight in a UTC+2 offset appearing "the day
    // before" in UTC terms for the time-of-day, but the calendar date this
    // represents is still the 20th, not the 19th.
    const date = calendarDateFromIso('2026-09-20T22:00:00.000Z');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(20);
  });

});

describe('calendarDateToIso', () => {

  it('encodes the given local calendar date as UTC midnight for that same day', () => {
    const iso = calendarDateToIso(new Date(2026, 8, 20));
    expect(iso).toBe('2026-09-20T00:00:00.000Z');
  });

  it('round-trips through calendarDateFromIso without shifting the day', () => {
    const original = '2026-09-16T22:00:00.000Z';
    const roundTripped = calendarDateToIso(calendarDateFromIso(original));
    expect(new Date(roundTripped).getUTCDate()).toBe(new Date(original).getUTCDate());
  });

});
