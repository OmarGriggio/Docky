import { describe, it, expect } from 'vitest';
import { DraftLine, DraftSection, blankSection, isBlankSection, lineTotal, nextDraftId, sectionTotal, usedResourceIds, findSameResource } from './document-draft';

const line = (overrides: Partial<DraftLine> = {}): DraftLine => ({
  id: 1, type: 'MATERIAL', label: 'Sac', quantity: 2, unit: 'Sac', unit_price: 10, discount: 0, resource_id: null,
  ...overrides,
});

describe('lineTotal', () => {

  it('is quantity x unit price', () => {
    expect(lineTotal(line())).toBe(20);
  });

  it('applies the line discount and rounds to cents', () => {
    expect(lineTotal(line({ quantity: 3, unit_price: 3.33, discount: 10 }))).toBe(8.99);
  });

  it('treats a missing quantity as 0', () => {
    expect(lineTotal(line({ quantity: null }))).toBe(0);
  });

});

describe('sectionTotal', () => {

  it('sums its lines', () => {
    const section: DraftSection = { id: 1, title: '', description: '', lines: [line(), line({ id: 2, unit_price: 5.5 })] };
    expect(sectionTotal(section)).toBe(31);
  });

});

describe('usedResourceIds', () => {

  it('collects the catalog resources used across every section, ignoring hand-typed lines', () => {
    const sections: DraftSection[] = [
      { id: 1, title: '', description: '', lines: [line({ resource_id: 4 }), line({ id: 2 })] },
      { id: 2, title: '', description: '', lines: [line({ id: 3, resource_id: 7 })] },
    ];
    expect([...usedResourceIds(sections)].sort()).toEqual([4, 7]);
  });

});

describe('nextDraftId', () => {

  it('never hands out the same id twice', () => {
    expect(nextDraftId()).not.toBe(nextDraftId());
  });

});

describe('isBlankSection', () => {

  it('is true for the section a new document starts with', () => {
    expect(isBlankSection(blankSection())).toBe(true);
  });

  it('ignores spaces', () => {
    expect(isBlankSection({ ...blankSection(), title: '  ', description: ' ' })).toBe(true);
  });

  it('is false once anything is typed or added', () => {
    expect(isBlankSection({ ...blankSection(), title: 'Gros oeuvre' })).toBe(false);
    expect(isBlankSection({ ...blankSection(), description: 'Etage' })).toBe(false);
    expect(isBlankSection({ ...blankSection(), lines: [line()] })).toBe(false);
  });

});

describe('findSameResource', () => {
  const resource = { id: 7, type: 'MATERIAL' as const, name: 'Sac de ciment', unit: 'Sac', selling_price: 12.5 };

  it('finds a resource with the same type, designation, unit and price', () => {
    expect(findSameResource(line({ label: '  sac de CIMENT ', unit: 'sac', unit_price: 12.5 }), [resource])).toBe(resource);
  });

  it('ignores one differing by type, designation, unit or price', () => {
    const typed = line({ label: 'Sac de ciment', unit: 'Sac', unit_price: 12.5 });
    expect(findSameResource({ ...typed, type: 'SERVICE' }, [resource])).toBeUndefined();
    expect(findSameResource({ ...typed, label: 'Sac de chaux' }, [resource])).toBeUndefined();
    expect(findSameResource({ ...typed, unit: 'kg' }, [resource])).toBeUndefined();
    expect(findSameResource({ ...typed, unit_price: 12.55 }, [resource])).toBeUndefined();
  });

  it('reads a price sent as text to the cent', () => {
    const fromApi = { ...resource, selling_price: '12.50' as unknown as number };
    expect(findSameResource(line({ label: 'Sac de ciment', unit: 'Sac', unit_price: 12.5 }), [fromApi])).toBe(fromApi);
  });
});
