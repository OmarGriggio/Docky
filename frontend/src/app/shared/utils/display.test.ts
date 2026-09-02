import { describe, it, expect } from 'vitest';
import { clientDisplayName, archiveActionLabel } from './display';

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
