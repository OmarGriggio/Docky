import { describe, expect, it } from "vitest";
import { createReminderDto } from "./reminder.dto";
import { sampleSourceOf } from "../../../modules/templates/template.sample";
import { Company } from "../../../modules/companies/company.types";
import { Template } from "../../../modules/templates/template.types";
import { ReminderToPrint } from "../reminder.types";

const company = { id: 3, name: "Peinture SA", vat_rate: 8.1 } as Company;
const template = { id: 9, name: "Standard", layout: "CLASSIC", font: "HELVETICA", palette: [], element_colors: {}, show_currency: false, header_image: null } as unknown as Template;
const textOf = (dto: ReturnType<typeof createReminderDto>) => dto.text.map(run => run.text).join("");
const reminder = (overrides: Partial<ReminderToPrint> = {}): ReminderToPrint =>
  ({ level: 1, date: new Date(2026, 10, 24), text: "{{montant}}", fee: 0, totalFees: 0, ...overrides });

describe("createReminderDto", () => {
  it("asks a final invoice's balance, its VAT still the invoice's own", () => {
    const { document, client, style } = sampleSourceOf(company, template, "REMINDER", "FR");
    const vat = (document.amount_incl_vat - document.amount_excl_vat).toFixed(2);
    const dto = createReminderDto(document, client, company, style, reminder({ text: "{{montant}} / {{montant_tva}}" }), 400);
    expect(textOf(dto)).toBe(`400.00 CHF / ${vat} CHF`);
  });

  it("asks the invoice's total without deposits", () => {
    const { document, client, style } = sampleSourceOf(company, template, "REMINDER", "FR");
    expect(textOf(createReminderDto(document, client, company, style, reminder()))).toBe(`${document.amount_incl_vat.toFixed(2)} CHF`);
  });

  it("is dated the day it was sent, its days overdue counted to it", () => {
    const { document, client, style } = sampleSourceOf(company, template, "REMINDER", "FR", new Date(2026, 10, 1));
    const dto = createReminderDto(document, client, company, style, reminder({ text: "{{jours_retard}}", date: new Date(2026, 10, 24) }));
    expect(dto.letter.date).toEqual(new Date(2026, 10, 24));
    expect(textOf(dto)).toBe("38");
  });

  it("adds the fees under the text, none without fees", () => {
    const { document, client, style } = sampleSourceOf(company, template, "REMINDER", "FR");
    expect(createReminderDto(document, client, company, style, reminder({ level: 2, fee: 20, totalFees: 20 }), 100).amounts)
      .toEqual({ balance: 100, fees: 20, total: 120 });
    expect(createReminderDto(document, client, company, style, reminder(), 100).amounts).toBeNull();
  });
});
