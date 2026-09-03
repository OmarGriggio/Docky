// Pure math only — no database, no network, nothing async. That's what makes this
// file easy to unit test: given the same inputs, it always returns the same output.
// The DB-touching orchestration (fetch the document, fetch its lines, save the
// result) stays in document.service.ts and calls this function.

export interface LineForCalculation {
  // null on a SECTION/NOTE line (presentation-only, no price) — see
  // document_lines.type in zz_migrations/000_base.sql.
  quantity: number | null;
  unit_price: number | null;
  discount: number | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

// amount_excl_vat is the sum of each priced line's own total (quantity × unit
// price × (1 − line discount%)), with the document's own discount% applied on
// top of that sum. SECTION/NOTE lines (quantity/unit_price both null) carry no
// amount and are skipped. amount_incl_vat then applies the document's single
// vat_rate on top — Switzerland has one standard rate, so there's no need for
// a rate per line.
export const computeDocumentTotals = (
  lines: LineForCalculation[],
  documentDiscount: number,
  vatRate = 0
): { amount_excl_vat: number; amount_incl_vat: number } => {
  const subtotal = lines.reduce((sum, line) => {
    if (line.quantity === null || line.unit_price === null) {
      return sum;
    }
    const lineTotal = line.quantity * line.unit_price * (1 - (line.discount ?? 0) / 100);
    return sum + lineTotal;
  }, 0);

  const amount_excl_vat = round2(subtotal * (1 - documentDiscount / 100));
  const amount_incl_vat = round2(amount_excl_vat * (1 + vatRate / 100));

  return { amount_excl_vat, amount_incl_vat };
};
