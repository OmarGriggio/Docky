import { describe, expect, it } from 'vitest';
import { buildImportLines, cellText, guessField, guessMapping, headerRowIndex, mapsAName } from './import-columns';

describe('guessField', () => {
  it('recognizes a header whatever its case, accents and punctuation', () => {
    expect(guessField('N° client')).toBe('client_number');
    expect(guessField('Société')).toBe('company_name');
    expect(guessField('Code postal')).toBe('postal_code');
    expect(guessField('PLZ')).toBe('postal_code');
    expect(guessField('E-mail')).toBe('email');
    expect(guessField('NPA / Ville')).toBe('postal_code_city');
    expect(guessField('Rue et n°')).toBe('street');
  });

  it('takes a bare "N°" for the building number, never the client number', () => {
    expect(guessField('N°')).toBe('house_number');
    expect(guessField('No')).toBe('house_number');
    expect(guessField('N° client')).toBe('client_number');
  });

  it('knows nothing of a header it has no word for', () => {
    expect(guessField('Chiffre d’affaires 2025')).toBeNull();
    expect(guessField('')).toBeNull();
  });
});

describe('guessMapping', () => {
  it('feeds each field from one column at most - the first naming it', () => {
    expect(guessMapping(['Nom', 'Prénom', 'Name', 'Divers'])).toEqual(['last_name', 'first_name', null, null]);
  });
});

describe('cellText', () => {
  it('writes a cell as text', () => {
    expect(cellText(1950)).toBe('1950');
    expect(cellText('  Sion ')).toBe('Sion');
    expect(cellText(null)).toBe('');
    expect(cellText(new Date(2026, 11, 31))).toBe('31.12.2026');
    expect(cellText(true)).toBe('true');
  });
});

describe('buildImportRows', () => {
  const table = [
    ['Liste des clients 2025', '', ''],
    ['', '', ''],
    ['Nom', 'Ville', 'Divers'],
    ['Dupont', 'Sion', 'x'],
    ['', '', 'y'],
    ['Martin', '', ''],
  ];

  it('finds the header below a title and a blank line', () => {
    expect(headerRowIndex(table)).toBe(2);
  });

  it("takes a single column sheet's first row as its header", () => {
    expect(headerRowIndex([['', ''], ['Nom', ''], ['Dupont', '']])).toBe(1);
  });

  it('keeps the mapped columns only, and leaves out a row with nothing in them', () => {
    expect(buildImportLines(table, ['last_name', 'city', null]).map(({ row }) => row)).toEqual([
      { last_name: 'Dupont', city: 'Sion' },
      { last_name: 'Martin' },
    ]);
  });

  it("numbers each row as the spreadsheet does", () => {
    expect(buildImportLines(table, ['last_name', null, null]).map(({ line }) => line)).toEqual([4, 6]);
  });

  it('has no rows for an empty sheet', () => {
    expect(buildImportLines([['', '']], ['last_name', null])).toEqual([]);
  });
});

describe('mapsAName', () => {
  it('needs a company, a last name or a full name to make a client', () => {
    expect(mapsAName(['email', 'city'])).toBe(false);
    expect(mapsAName(['email', 'full_name'])).toBe(true);
  });
});
