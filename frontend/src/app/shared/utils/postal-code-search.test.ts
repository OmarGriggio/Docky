import { describe, expect, it } from 'vitest';
import { PostalCode, searchPostalCodes } from './postal-code-search';

const codes: PostalCode[] = [
  { npa: '1950', town: 'Savièse' },
  { npa: '1950', town: 'Sion' },
  { npa: '1951', town: 'Sion' },
  { npa: '1965', town: 'Savièse' },
  { npa: '3960', town: 'Sierre' },
  { npa: '8001', town: 'Zürich' },
  { npa: '8302', town: 'Kloten' },
];

const labels = (found: PostalCode[]) => found.map(code => `${code.npa} ${code.town}`);

describe('searchPostalCodes', () => {
  it('matches the start of the NPA', () => {
    expect(labels(searchPostalCodes(codes, '195'))).toEqual(['1950 Savièse', '1950 Sion', '1951 Sion']);
  });

  it('matches a town by name, accents and case aside', () => {
    expect(labels(searchPostalCodes(codes, 'zurich'))).toEqual(['8001 Zürich']);
    expect(labels(searchPostalCodes(codes, 'SAVIESE'))).toEqual(['1950 Savièse', '1965 Savièse']);
  });

  it('narrows an NPA by town', () => {
    expect(labels(searchPostalCodes(codes, '1950 si'))).toEqual(['1950 Sion']);
  });

  it('puts towns starting with the text first', () => {
    expect(labels(searchPostalCodes(codes, 'lo'))).toEqual(['8302 Kloten']);
    expect(labels(searchPostalCodes(codes, 'si'))).toEqual(['1950 Sion', '1951 Sion', '3960 Sierre']);
  });

  it('suggests nothing for an empty query, and stops at the limit', () => {
    expect(searchPostalCodes(codes, '  ')).toEqual([]);
    expect(searchPostalCodes(codes, '1', 2)).toHaveLength(2);
  });
});
