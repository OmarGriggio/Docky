import { describe, it, expect } from 'vitest';
import { clientDisplayName, archiveActionLabel, formatFileSize, formatSectionDate, addressLabel } from './display';

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

describe('formatSectionDate', () => {

  it('shows only the date when there is no time component', () => {
    const date = new Date(2026, 8, 20, 0, 0);
    expect(formatSectionDate(date)).toBe('20.09.2026');
  });

  it('shows the time too once one is set', () => {
    const date = new Date(2026, 8, 20, 14, 5);
    expect(formatSectionDate(date)).toBe('20.09.2026 14:05');
  });

  it('accepts an ISO string the same way', () => {
    const date = new Date(2026, 8, 20, 9, 30);
    expect(formatSectionDate(date.toISOString())).toBe('20.09.2026 09:30');
  });

});
