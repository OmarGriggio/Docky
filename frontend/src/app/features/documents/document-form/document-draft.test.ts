import { describe, it, expect } from 'vitest';
import { DraftLine, DraftSection, lineTotal, nextDraftId, sectionTotal, usedResourceIds } from './document-draft';

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
