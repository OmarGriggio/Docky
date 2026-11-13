import { describe, expect, it } from "vitest";
import { amountDue, ChantierInvoice, depositAmounts, depositsToDeduct, summarizeBilling } from "./deposit";

describe("depositAmounts", () => {
  it("takes a percentage of the quote's total incl. VAT", () => {
    expect(depositAmounts({ percent: 30 }, 54050, 8.1)).toEqual({ inclVat: 16215, exclVat: 15000, percent: 30 });
  });

  it("takes an amount incl. VAT as given", () => {
    expect(depositAmounts({ amount_incl_vat: "1081" }, null, 8.1)).toEqual({ inclVat: 1081, exclVat: 1000, percent: null });
  });

  it("rounds to the centime", () => {
    expect(depositAmounts({ percent: 33.33 }, 1000, 8.1)).toEqual({ inclVat: 333.3, exclVat: 308.33, percent: 33.33 });
    expect(depositAmounts({ amount_incl_vat: 100 }, null, 0).exclVat).toBe(100);
  });

  it("needs exactly one of a percentage or an amount", () => {
    expect(() => depositAmounts({}, 1000, 8.1)).toThrow("Give either");
    expect(() => depositAmounts({ percent: 30, amount_incl_vat: 100 }, 1000, 8.1)).toThrow("Give either");
  });

  it("refuses a percentage outside 0-100, or without a quote", () => {
    expect(() => depositAmounts({ percent: 0 }, 1000, 8.1)).toThrow("percent");
    expect(() => depositAmounts({ percent: 101 }, 1000, 8.1)).toThrow("percent");
    expect(() => depositAmounts({ percent: "abc" }, 1000, 8.1)).toThrow("percent");
    expect(() => depositAmounts({ percent: 30 }, null, 8.1)).toThrow("needs the chantier's quote");
  });

  it("refuses an amount of nothing, or less", () => {
    expect(() => depositAmounts({ amount_incl_vat: 0 }, null, 8.1)).toThrow("amount_incl_vat");
    expect(() => depositAmounts({ amount_incl_vat: -5 }, null, 8.1)).toThrow("amount_incl_vat");
    expect(() => depositAmounts({ amount_incl_vat: 0.001 }, null, 8.1)).toThrow("comes to nothing");
  });
});

describe("summarizeBilling", () => {
  const deposit = (status: ChantierInvoice["status"], amount: number): ChantierInvoice =>
    ({ id: 1, number: "FAC-2026-0001", date: new Date(), status, amount_incl_vat: amount });

  it("counts deposits sent or paid, not drafts nor cancelled ones", () => {
    expect(summarizeBilling(54050, [
      deposit("PAID", 16215), deposit("SENT", 16215), deposit("DRAFT", 5000), deposit("CANCELLED", 1000),
    ])).toEqual({ quoteInclVat: 54050, invoicedInclVat: 32430, paidInclVat: 16215, remainingInclVat: 21620 });
  });

  it("has nothing left to compare with for a chantier without a quote", () => {
    expect(summarizeBilling(null, [deposit("SENT", 500)]).remainingInclVat).toBeNull();
  });

  it("counts the final invoice's balance once it's out, leaving nothing to invoice", () => {
    expect(summarizeBilling(54050, [deposit("PAID", 16215)], { status: "SENT", amountDue: 40000 }))
      .toEqual({ quoteInclVat: 54050, invoicedInclVat: 56215, paidInclVat: 16215, remainingInclVat: 0 });
    expect(summarizeBilling(54050, [deposit("PAID", 16215)], { status: "PAID", amountDue: 37835 }).paidInclVat).toBe(54050);
  });

  it("leaves a final invoice still a draft out", () => {
    expect(summarizeBilling(54050, [deposit("PAID", 16215)], { status: "DRAFT", amountDue: 37835 }).remainingInclVat).toBe(37835);
  });
});

describe("depositsToDeduct", () => {
  const deposit = (id: number, status: ChantierInvoice["status"]): ChantierInvoice =>
    ({ id, number: `FAC-2026-000${id}`, date: new Date(2026, 2, id), status, amount_incl_vat: 1000 * id });

  it("deducts the deposits sent or paid, an unpaid one included", () => {
    expect(depositsToDeduct([deposit(1, "PAID"), deposit(2, "SENT"), deposit(3, "CANCELLED"), deposit(4, "DRAFT")])
      .map(deduction => deduction.document_id)).toEqual([1, 2]);
  });

  it("keeps a deposit's date as a plain date", () => {
    expect(depositsToDeduct([deposit(1, "PAID")])[0].date).toBe("2026-03-01");
  });
});

describe("amountDue", () => {
  const deduction = (amount: number) => ({ document_id: 1, number: "FAC", date: "2026-03-01", amount_incl_vat: amount });

  it("is the total less every deposit", () => {
    expect(amountDue(54050, [deduction(16215), deduction(16215)])).toBe(21620);
    expect(amountDue(100.1, [deduction(33.37)])).toBe(66.73);
  });

  it("is the whole total without deposits, and goes negative when they were more", () => {
    expect(amountDue(500, [])).toBe(500);
    expect(amountDue(500, [deduction(600)])).toBe(-100);
  });
});
