import { describe, expect, it } from "vitest";
import { createReminderDto } from "./reminder.dto";
import { sampleSourceOf } from "../../../modules/templates/template.sample";
import { Company } from "../../../modules/companies/company.types";
import { Template } from "../../../modules/templates/template.types";

const company = { id: 3, name: "Peinture SA", vat_rate: 8.1 } as Company;
const template = { id: 9, name: "Standard", layout: "CLASSIC", font: "HELVETICA", palette: [], element_colors: {}, show_currency: false, header_image: null } as unknown as Template;
const textOf = (dto: ReturnType<typeof createReminderDto>) => dto.text.map(run => run.text).join("");

describe("createReminderDto", () => {
  it("asks a final invoice's balance, its VAT still the invoice's own", () => {
    const { document, client, style } = sampleSourceOf(company, template, "REMINDER", "FR");
    const vat = (document.amount_incl_vat - document.amount_excl_vat).toFixed(2);
    const dto = createReminderDto(document, client, company, style, "{{montant}} / {{montant_tva}}", 400);
    expect(textOf(dto)).toBe(`400.00 CHF / ${vat} CHF`);
  });

  it("asks the invoice's total without deposits", () => {
    const { document, client, style } = sampleSourceOf(company, template, "REMINDER", "FR");
    expect(textOf(createReminderDto(document, client, company, style, "{{montant}}"))).toBe(`${document.amount_incl_vat.toFixed(2)} CHF`);
  });
});
