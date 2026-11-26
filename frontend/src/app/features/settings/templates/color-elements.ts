import { ColorElement, DocumentLayout } from '../../../shared/models/template';

// The template editor's element colors, by zone of the page in reading order
// - the zones and their order depend on the layout, and an element a layout
// never prints isn't offered (its stored color is kept, just not shown):
// the company's name is only the modern header's, the table's header row
// isn't the classic layout's (its sections are on the details pages).
// Which element each layout colors: the backend's business-letter.ts
// (CLASSIC), modern-letter.ts (MODERN), banner-letter.ts (BANNER).

export type ColorZone = 'header' | 'table' | 'totals' | 'conditions' | 'details' | 'footer' | 'body';

export interface ColorZoneGroup {
  zone: ColorZone;
  elements: ColorElement[];
}

const CONDITIONS: ColorElement[] = ['conditionsHeading', 'scaleEarly', 'scaleNet', 'approval'];

const ZONES: Record<DocumentLayout, ColorZoneGroup[]> = {
  CLASSIC: [
    { zone: 'header', elements: ['title'] },
    { zone: 'totals', elements: ['total', 'earlyPayment'] },
    { zone: 'conditions', elements: CONDITIONS },
    { zone: 'details', elements: ['sectionTitles'] },
    { zone: 'footer', elements: ['footer'] },
    { zone: 'body', elements: ['text'] },
  ],
  MODERN: [
    { zone: 'header', elements: ['companyName', 'title'] },
    { zone: 'table', elements: ['tableHeader', 'sectionTitles'] },
    { zone: 'totals', elements: ['total', 'earlyPayment'] },
    { zone: 'conditions', elements: CONDITIONS },
    { zone: 'footer', elements: ['footer'] },
    { zone: 'body', elements: ['text'] },
  ],
  BANNER: [
    { zone: 'header', elements: ['title'] },
    { zone: 'table', elements: ['sectionTitles', 'tableHeader'] },
    { zone: 'totals', elements: ['total', 'earlyPayment'] },
    { zone: 'conditions', elements: CONDITIONS },
    { zone: 'footer', elements: ['footer'] },
    { zone: 'body', elements: ['text'] },
  ],
};

/** The zones of the page a layout colors, in reading order, each with its elements. */
export const colorZonesOf = (layout: DocumentLayout): ColorZoneGroup[] => ZONES[layout] ?? ZONES.CLASSIC;

// The elements whose place differs from one layout to another - their hint
// is the layout's own (templates.elementHints.<element>_<LAYOUT>).
const HINT_PER_LAYOUT: Partial<Record<ColorElement, DocumentLayout[]>> = {
  title: ['CLASSIC', 'MODERN', 'BANNER'],
  sectionTitles: ['CLASSIC', 'MODERN', 'BANNER'],
  tableHeader: ['MODERN', 'BANNER'],
  total: ['CLASSIC'],
  footer: ['BANNER'],
};

/** Where an element is on the page, as a Transloco key - the layout's own wording when it differs. */
export const elementHintKey = (element: ColorElement, layout: DocumentLayout): string =>
  HINT_PER_LAYOUT[element]?.includes(layout) ? `templates.elementHints.${element}_${layout}` : `templates.elementHints.${element}`;

type PreviewKind = 'QUOTE' | 'INVOICE' | 'REMINDER';

// What each kind of document prints: a quote's "Bon pour accord", an
// invoice's early payment line and scale, a reminder only its letterhead,
// text and footer.
const ONLY_ON: Partial<Record<ColorElement, PreviewKind>> = {
  approval: 'QUOTE',
  earlyPayment: 'INVOICE',
  scaleEarly: 'INVOICE',
  scaleNet: 'INVOICE',
};
const ON_A_REMINDER: ColorElement[] = ['title', 'companyName', 'text', 'footer'];

/** The preview to show an element spotted ("Repérer") in: the current one when it prints it, else one that does. */
export const previewKindFor = (element: ColorElement, current: PreviewKind): PreviewKind => {
  const only = ONLY_ON[element];
  if (only) {
    return only;
  }
  return current === 'REMINDER' && !ON_A_REMINDER.includes(element) ? 'INVOICE' : current;
};

/** Whether an element only prints with an early payment discount on the template (the line under the total, the scale). */
export const needsEarlyPayment = (element: ColorElement): boolean =>
  element === 'earlyPayment' || element === 'scaleEarly' || element === 'scaleNet';
