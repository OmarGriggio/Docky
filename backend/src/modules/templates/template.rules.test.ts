import { describe, expect, it } from "vitest";
import { documentStyleOf, normalizeTemplateData, quotePaymentTermsOf, styleOf } from "./template.rules";

describe("normalizeTemplateData", () => {
  it("trims the name and requires one", () => {
    expect(normalizeTemplateData({ name: "  Rénovation " }).name).toBe("Rénovation");
    expect(() => normalizeTemplateData({ name: "  " })).toThrow();
    expect(() => normalizeTemplateData({ name: "x".repeat(101) })).toThrow();
    expect(() => normalizeTemplateData({})).toThrow();
  });

  it("keeps known layouts and fonts, the defaults otherwise", () => {
    expect(normalizeTemplateData({ name: "a", layout: "MODERN", font: "LATO" })).toMatchObject({ layout: "MODERN", font: "LATO" });
    expect(normalizeTemplateData({ name: "a", layout: "BANNER" })).toMatchObject({ layout: "BANNER" });
    expect(normalizeTemplateData({ name: "a", layout: "FANCY", font: 3 })).toMatchObject({ layout: "CLASSIC", font: "HELVETICA" });
  });

  it("keeps a palette of up to 5 colors, lowercase, named", () => {
    expect(normalizeTemplateData({ name: "a", palette: [{ name: " Vert ", color: "#037A3F" }, { color: "#1d4ed8" }] }).palette)
      .toEqual([{ name: "Vert", color: "#037a3f" }, { name: "Couleur 2", color: "#1d4ed8" }]);
    expect(normalizeTemplateData({ name: "a" }).palette).toEqual([]);
    expect(() => normalizeTemplateData({ name: "a", palette: [{ color: "#fff" }] })).toThrow();
    expect(() => normalizeTemplateData({ name: "a", palette: Array(6).fill({ color: "#000000" }) })).toThrow();
    expect(() => normalizeTemplateData({ name: "a", palette: "red" })).toThrow();
    expect(() => normalizeTemplateData({ name: "a", palette: [{ color: "#000000", name: "x".repeat(31) }] })).toThrow();
  });

  it("keeps each known element's palette position, drops anything else", () => {
    const palette = [{ color: "#037a3f" }, { color: "#1d4ed8" }];
    expect(normalizeTemplateData({ name: "a", palette, element_colors: { title: 2, total: 1, footer: 3, text: 0, unknown: 1, approval: "1" } }).element_colors)
      .toEqual({ title: 2, total: 1 });
    expect(normalizeTemplateData({ name: "a", element_colors: { title: 1 } }).element_colors).toEqual({});
    expect(normalizeTemplateData({ name: "a", palette, element_colors: [1, 2] }).element_colors).toEqual({});
  });

  it("shows the currency only when asked to", () => {
    expect(normalizeTemplateData({ name: "a" }).show_currency).toBe(false);
    expect(normalizeTemplateData({ name: "a", show_currency: "true" }).show_currency).toBe(false);
    expect(normalizeTemplateData({ name: "a", show_currency: true }).show_currency).toBe(true);
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
  const template = { layout: "MODERN" as const, font: "LATO" as const, palette: [{ name: "Vert", color: "#037a3f" }], element_colors: { total: 1 }, show_currency: true, header_image: "companies/1/header.jpg" };

  it("is the template's look while the document isn't frozen", () => {
    expect(documentStyleOf(null, template)).toEqual(styleOf(template));
  });

  it("is what the document was frozen with once sent, whatever its template is now", () => {
    const frozen = { layout: "CLASSIC" as const, font: "PT_SERIF" as const, palette: [{ name: "Bleu", color: "#1d4ed8" }], element_colors: { title: 1 }, show_currency: false, header_image: null };
    expect(documentStyleOf(frozen, template)).toEqual(frozen);
    expect(documentStyleOf({ ...frozen, layout: "BANNER" }, template).layout).toBe("BANNER");
  });

  it("reads anything unknown in a frozen look as the default, a broken palette as none", () => {
    expect(documentStyleOf({ palette: "red" as never, element_colors: { title: 1 } }, template)).toMatchObject({ palette: [], element_colors: {} });
    expect(documentStyleOf({ layout: "FANCY" as never, font: "Comic" as never }, template))
      .toEqual({ layout: "CLASSIC", font: "HELVETICA", palette: [], element_colors: {}, show_currency: false, header_image: null });
  });
});

describe("quotePaymentTermsOf", () => {
  const template = { payment_terms: "10 jours net" };

  it("is the template's while the quote is a draft, or was frozen before its terms were", () => {
    expect(quotePaymentTermsOf(null, template)).toBe("10 jours net");
    expect(quotePaymentTermsOf({ layout: "CLASSIC" }, template)).toBe("10 jours net");
  });

  it("is what the quote was sent with, whatever its template says now", () => {
    expect(quotePaymentTermsOf({ layout: "CLASSIC", payment_terms: "30 jours net" }, template)).toBe("30 jours net");
    expect(quotePaymentTermsOf({ layout: "CLASSIC", payment_terms: null }, template)).toBeNull();
  });
});
