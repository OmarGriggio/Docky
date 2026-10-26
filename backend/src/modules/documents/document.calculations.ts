// Pure math only — no database, no network, nothing async. That's what makes this
// file easy to unit test: given the same inputs, it always returns the same output.
// The DB-touching orchestration (fetch the document, fetch its lines, save the
// result) stays in document.service.ts and calls this function.

export interface LineForCalculation {
  quantity: number;
  unit_price: number;
  discount: number | null;
}

// Half up, to the cent. Number.EPSILON: 15.195 * 100 is 1519.4999... in
// floating point, which a plain Math.round would take down to 15.19.
export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// One line's own total, its own discount% applied, rounded to the cent - the
// figure printed on the line (PDF, form), so the lines, the sections and
// amount_excl_vat all add up exactly. The frontend's document-draft.ts
// computes it the same way.
export const lineTotal = (line: LineForCalculation): number => {
  return round2(line.quantity * line.unit_price * (1 - (line.discount ?? 0) / 100));
};

// amount_excl_vat is the sum of each line's own (rounded) total, with the
// document's own discount% applied on top of that sum. amount_incl_vat then
// applies the document's single vat_rate on top — Switzerland has one
// standard rate, so there's no need for a rate per line.
export const computeDocumentTotals = (
  lines: LineForCalculation[],
  documentDiscount: number,
  vatRate = 0
): { amount_excl_vat: number; amount_incl_vat: number } => {
  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);

  const amount_excl_vat = round2(subtotal * (1 - documentDiscount / 100));
  const amount_incl_vat = round2(amount_excl_vat * (1 + vatRate / 100));

  return { amount_excl_vat, amount_incl_vat };
};
