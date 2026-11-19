import { describe, expect, it } from "vitest";
import { documentStyleOf, normalizeTemplateData, styleOf } from "./template.rules";

describe("normalizeTemplateData", () => {
  it("trims the name and requires one", () => {
    expect(normalizeTemplateData({ name: "  Rénovation " }).name).toBe("Rénovation");
    expect(() => normalizeTemplateData({ name: "  " })).toThrow();
    expect(() => normalizeTemplateData({ name: "x".repeat(101) })).toThrow();
    expect(() => normalizeTemplateData({})).toThrow();
  });

  it("keeps known layouts and fonts, the defaults otherwise", () => {
    expect(normalizeTemplateData({ name: "a", layout: "MODERN", font: "LATO" })).toMatchObject({ layout: "MODERN", font: "LATO" });
    expect(normalizeTemplateData({ name: "a", layout: "FANCY", font: 3 })).toMatchObject({ layout: "CLASSIC", font: "HELVETICA" });
  });

  it("stores colors lowercase, an empty one as null, refuses anything else", () => {
    expect(normalizeTemplateData({ name: "a", accent_color: "#B8860B", secondary_color: "" })).toMatchObject({ accent_color: "#b8860b", secondary_color: null });
    expect(() => normalizeTemplateData({ name: "a", accent_color: "#fff" })).toThrow();
    expect(() => normalizeTemplateData({ name: "a", secondary_color: 5 })).toThrow();
  });

  it("checks the due days and texts", () => {
    expect(normalizeTemplateData({ name: "a", quote_due_days: "30", invoice_due_days: "" })).toMatchObject({ quote_due_days: 30, invoice_due_days: null });
    expect(() => normalizeTemplateData({ name: "a", invoice_due_days: 1.5 })).toThrow();
    expect(() => normalizeTemplateData({ name: "a", quote_due_days: -1 })).toThrow();
    expect(() => normalizeTemplateData({ name: "a", payment_terms: 12 })).toThrow();
    expect(() => normalizeTemplateData({ name: "a", reminder_text: "x".repeat(10001) })).toThrow();
  });

  it("checks the early payment discount, its days cleared without a rate", () => {
    expect(normalizeTemplateData({ name: "a", early_payment_discount: 2, early_payment_days: 10, early_payment_min_amount: 500 }))
      .toMatchObject({ early_payment_discount: 2, early_payment_days: 10, early_payment_min_amount: 500 });
    expect(normalizeTemplateData({ name: "a", early_payment_discount: 0, early_payment_days: 10 })).toMatchObject({ early_payment_days: null });
    expect(() => normalizeTemplateData({ name: "a", early_payment_discount: 2 })).toThrow();
    expect(() => normalizeTemplateData({ name: "a", early_payment_discount: 101, early_payment_days: 10 })).toThrow();
    expect(() => normalizeTemplateData({ name: "a", early_payment_min_amount: -1 })).toThrow();
  });
});

describe("documentStyleOf", () => {
  const template = { layout: "MODERN" as const, font: "LATO" as const, accent_color: "#037a3f", secondary_color: null, header_image: "companies/1/header.jpg" };

  it("is the template's look while the document isn't frozen", () => {
    expect(documentStyleOf(null, template)).toEqual(styleOf(template));
  });

  it("is what the document was frozen with once sent, whatever its template is now", () => {
    expect(documentStyleOf({ layout: "CLASSIC", font: "PT_SERIF", accent_color: null, secondary_color: "#1d4ed8", header_image: null }, template))
      .toEqual({ layout: "CLASSIC", font: "PT_SERIF", accent_color: null, secondary_color: "#1d4ed8", header_image: null });
  });

  it("reads anything unknown in a frozen look as the default", () => {
    expect(documentStyleOf({ layout: "FANCY" as never, font: "Comic" as never }, template))
      .toEqual({ layout: "CLASSIC", font: "HELVETICA", accent_color: null, secondary_color: null, header_image: null });
  });
});
