// The local, in-progress shape of a document's sections/lines while the form
// is being edited - shared by the form itself and the sections table. Nothing
// here is persisted as-is: submit() (document-form.ts) creates the real
// document_sections/document_lines rows from it.

// Matches shared/models/document-line.ts's DocumentLine - both types share
// quantity+unit for their amount (e.g. "20 Sac" for a material, "5 Heure"
// for a service), no separate time field. No `reference` either -
// document_lines has no such column.
export type DraftLineType = 'MATERIAL' | 'SERVICE';

export interface DraftLine {
  id: number;
  type: DraftLineType;
  label: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number;
  discount: number;        // %
  // Which catalog resource this line came from, if any (null for a
  // hand-typed line) - sent to the backend (document_lines.resource_id), so
  // an accepted quote can turn it into a project_resources row (see
  // document.service.ts's acceptQuoteServ). Also used locally to keep an
  // already-used resource out of the "add a resource" picker (see
  // usedResourceIds).
  resource_id: number | null;
}

export interface DraftSection {
  id: number;
  title: string;
  description: string;
  lines: DraftLine[];
}

export const round2 = (value: number) => Math.round(value * 100) / 100;

// Local ids only (never sent to the backend), one counter for every draft
// section/line on the page so two of them never collide.
let nextId = 1;
export const nextDraftId = (): number => nextId++;

export const lineTotal = (line: DraftLine): number =>
  round2((line.quantity ?? 0) * line.unit_price * (1 - line.discount / 100));

export const sectionTotal = (section: DraftSection): number =>
  round2(section.lines.reduce((sum, line) => sum + lineTotal(line), 0));

// A resource already used as a line anywhere in the document (however it got
// there - catalog picker or bulk import) no longer makes sense to offer
// again.
export const usedResourceIds = (sections: DraftSection[]): Set<number> =>
  new Set(
    sections
      .flatMap(section => section.lines)
      .map(line => line.resource_id)
      .filter((id): id is number => id !== null)
  );
