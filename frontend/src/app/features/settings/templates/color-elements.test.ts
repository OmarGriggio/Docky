import { describe, expect, it } from 'vitest';
import { COLOR_ELEMENTS, DocumentLayout } from '../../../shared/models/template';
import { colorZonesOf, elementHintKey } from './color-elements';

const elementsOf = (layout: DocumentLayout) => colorZonesOf(layout).flatMap(group => group.elements);

describe('colorZonesOf', () => {
  it('offers each layout only the elements it prints, each once', () => {
    expect(elementsOf('MODERN').sort()).toEqual([...COLOR_ELEMENTS].sort());
    expect(elementsOf('CLASSIC')).not.toContain('companyName');
    expect(elementsOf('CLASSIC')).not.toContain('tableHeader');
    expect(elementsOf('BANNER')).not.toContain('companyName');
    expect(elementsOf('BANNER')).toContain('tableHeader');
    for (const layout of ['CLASSIC', 'MODERN', 'BANNER'] as const) {
      expect(new Set(elementsOf(layout)).size).toBe(elementsOf(layout).length);
    }
  });

  it('orders the zones as the page reads, the sections where each layout prints them', () => {
    expect(colorZonesOf('CLASSIC').map(group => group.zone)).toEqual(['header', 'totals', 'conditions', 'details', 'footer', 'body']);
    expect(colorZonesOf('BANNER').map(group => group.zone)).toEqual(['header', 'table', 'totals', 'conditions', 'footer', 'body']);
  });
});

describe('elementHintKey', () => {
  it("is the layout's own where the element's place differs", () => {
    expect(elementHintKey('title', 'BANNER')).toBe('templates.elementHints.title_BANNER');
    expect(elementHintKey('footer', 'MODERN')).toBe('templates.elementHints.footer');
    expect(elementHintKey('scaleNet', 'CLASSIC')).toBe('templates.elementHints.scaleNet');
  });
});
