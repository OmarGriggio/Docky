import { describe, expect, it } from "vitest";
import { sampleSourceOf } from "./template.sample";
import { Company } from "../companies/company.types";
import { Template } from "./template.types";

const company = { id: 3, name: "Peinture SA", vat_rate: 8.1 } as Company;
const template = {
  id: 9, name: "Standard", layout: "MODERN", font: "LATO", palette: [{ name: "Vert", color: "#037a3f" }], element_colors: { title: 1 }, header_image: null,
  quote_introduction: "Offre", quote_conclusion: null, quote_due_days: 20, invoice_introduction: "Facture", invoice_conclusion: null, invoice_due_days: 10,
  payment_terms: "30 jours net", early_payment_discount: 2, early_payment_days: 10, early_payment_min_amount: 0, reminder_text: null,
} as unknown as Template;
const today = new Date("2026-11-20T12:00:00Z");
const days = (from: Date, to: Date | null) => Math.round((to!.getTime() - from.getTime()) / 86_400_000);

describe("sampleSourceOf", () => {
  it("prints a quote with the template's texts, look and due days, never an early payment discount", () => {
    const { document, style, amountDue, sample } = sampleSourceOf(company, template, "QUOTE", "FR", today);
    expect(document).toMatchObject({ type: "QUOTE", introduction: "Offre", payment_terms: "30 jours net", early_payment_discount: 0, vat_rate: 8.1 });
    expect(days(today, document.due_date)).toBe(20);
    expect(style).toMatchObject({ layout: "MODERN", font: "LATO", element_colors: { title: 1 } });
    expect(amountDue).toBe(document.amount_incl_vat);
    expect(sample).toBe(true);
  });

  it("adds its lines up like a real document", () => {
    const { document } = sampleSourceOf(company, template, "INVOICE", "FR", today);
    expect(document.amount_excl_vat).toBe(1642.23);
    expect(document.amount_incl_vat).toBe(1775.25);
    expect(new Set(document.lines.map(line => line.section_id))).toEqual(new Set(document.sections.map(section => section.id)));
  });

  it("gives an invoice the template's early payment discount, a reminder an invoice overdue", () => {
    expect(sampleSourceOf(company, template, "INVOICE", "FR", today).document).toMatchObject({ type: "INVOICE", introduction: "Facture", early_payment_discount: 2, early_payment_days: 10 });
    const reminder = sampleSourceOf(company, template, "REMINDER", "FR", today).document;
    expect(reminder).toMatchObject({ type: "INVOICE", status: "SENT" });
    expect(days(reminder.date, today)).toBe(45);
    expect(days(today, reminder.due_date)).toBe(-15);
  });

  it("writes the sample in the user's language", () => {
    const { client, document } = sampleSourceOf(company, template, "QUOTE", "EN", today);
    expect(client).toMatchObject({ title: "Ms", language: "EN" });
    expect(document.sections[0].title).toBe("Site preparation");
  });
});
