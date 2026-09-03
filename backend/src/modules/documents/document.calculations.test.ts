import { describe, it, expect } from "vitest";
import { computeDocumentTotals } from "./document.calculations";

describe("computeDocumentTotals", () => {

  it("returns 0 when there are no lines", () => {
    const result = computeDocumentTotals([], 0);
    expect(result).toEqual({ amount_excl_vat: 0, amount_incl_vat: 0 });
  });

  it("sums lines with no discount at all", () => {
    // Same numbers we verified by hand against the real API: QUOTE-2026-0001.
    const lines = [
      { quantity: 20, unit_price: 15, discount: 0 },  // 20 bags of cement at 15.-
      { quantity: 5, unit_price: 95, discount: 0 },   // 5h of mason at 95.-
    ];

    const result = computeDocumentTotals(lines, 0);

    expect(result).toEqual({ amount_excl_vat: 775, amount_incl_vat: 775 });
  });

  it("applies each line's own discount, then the document's discount on top", () => {
    // Same scenario tested live earlier today: line 1 has no discount, line 2 has
    // 10%, and the document itself also has a 10% discount applied on top of the sum.
    const lines = [
      { quantity: 10, unit_price: 100, discount: 0 },  // 10 * 100 = 1000
      { quantity: 5, unit_price: 50, discount: 10 },   // 5 * 50 * 0.9 = 225
    ];
    // subtotal = 1225, then 10% document discount -> 1102.5

    const result = computeDocumentTotals(lines, 10);

    expect(result).toEqual({ amount_excl_vat: 1102.5, amount_incl_vat: 1102.5 });
  });

  it("amount_incl_vat equals amount_excl_vat when no VAT rate is given (defaults to 0)", () => {
    const lines = [{ quantity: 3, unit_price: 10, discount: 0 }];

    const result = computeDocumentTotals(lines, 0);

    expect(result.amount_incl_vat).toBe(result.amount_excl_vat);
  });

  it("applies the document's vat_rate on top of amount_excl_vat", () => {
    const lines = [{ quantity: 10, unit_price: 100, discount: 0 }]; // 1000.-

    const result = computeDocumentTotals(lines, 0, 8.1);

    expect(result).toEqual({ amount_excl_vat: 1000, amount_incl_vat: 1081 });
  });

  it("rounds to 2 decimals", () => {
    const lines = [{ quantity: 3, unit_price: 10, discount: 33 }];
    // 3 * 10 * (1 - 0.33) = 20.099999999999998 without rounding

    const result = computeDocumentTotals(lines, 0);

    expect(result.amount_excl_vat).toBe(20.1);
  });

  it("skips SECTION/NOTE lines (no quantity/unit_price) when summing", () => {
    // A section title and a free-text note carry no amount of their own -
    // only the priced line between them counts.
    const lines = [
      { quantity: null, unit_price: null, discount: null },
      { quantity: 2, unit_price: 50, discount: 0 },
      { quantity: null, unit_price: null, discount: null },
    ];

    const result = computeDocumentTotals(lines, 0);

    expect(result).toEqual({ amount_excl_vat: 100, amount_incl_vat: 100 });
  });

});
