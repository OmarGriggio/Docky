import { describe, it, expect } from 'vitest';
import { clientDisplayName, archiveActionLabel, formatFileSize, closestDateStart } from './display';

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

describe('closestDateStart', () => {

  const now = new Date('2026-06-15T00:00:00.000Z').getTime();

  it('picks the closer of a past and a future date', () => {
    const sections = [
      { date_start: '2026-06-01T00:00:00.000Z' }, // 14 days before
      { date_start: '2026-06-20T00:00:00.000Z' }, // 5 days after
    ];
    expect(closestDateStart(sections, now)).toBe('2026-06-20T00:00:00.000Z');
  });

  it('ignores sections with no date_start', () => {
    const sections = [
      { date_start: null },
      { date_start: '2026-07-01T00:00:00.000Z' },
    ];
    expect(closestDateStart(sections, now)).toBe('2026-07-01T00:00:00.000Z');
  });

  it('returns null when nothing has a date_start', () => {
    const sections = [{ date_start: null }, { date_start: null }];
    expect(closestDateStart(sections, now)).toBeNull();
  });

});
