// Pure math only — no database, no network, nothing async. That's what makes this
// file easy to unit test: given the same inputs, it always returns the same output.
// The DB-touching orchestration (fetch the document, fetch its lines, save the
// result) stays in document.service.ts and calls this function.

export interface LineForCalculation {
  quantity: number;
  unit_price: number;
  discount: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

// No VAT rate exists anywhere in the app yet, so amount_incl_vat is simply
// amount_excl_vat for now — there's nothing to add to it. amount_excl_vat is the sum
// of each line's own total (quantity × unit price × (1 − line discount%)), with the
// document's own discount% applied on top of that sum.
export const computeDocumentTotals = (
  lines: LineForCalculation[],
  documentDiscount: number
): { amount_excl_vat: number; amount_incl_vat: number } => {
  const subtotal = lines.reduce((sum, line) => {
    const lineTotal = line.quantity * line.unit_price * (1 - line.discount / 100);
    return sum + lineTotal;
  }, 0);

  const amount_excl_vat = round2(subtotal * (1 - documentDiscount / 100));
  const amount_incl_vat = amount_excl_vat;

  return { amount_excl_vat, amount_incl_vat };
};
