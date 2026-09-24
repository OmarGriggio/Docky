import { describe, it, expect } from "vitest";
import { buildReminderValues, daysOverdue } from "./reminder.placeholders";

describe("daysOverdue", () => {

    it("counts whole calendar days, ignoring the time of day", () => {
        expect(daysOverdue(new Date(2026, 8, 4), new Date(2026, 8, 24, 15, 30))).toBe(20);
    });

    it("is 0 on the due date and never negative before it", () => {
        expect(daysOverdue(new Date(2026, 8, 24), new Date(2026, 8, 24, 9, 0))).toBe(0);
        expect(daysOverdue(new Date(2026, 8, 30), new Date(2026, 8, 24))).toBe(0);
    });

});

describe("buildReminderValues", () => {

    const invoice = { number: "FAC-2026-0002", date: new Date(2026, 7, 5), due_date: new Date(2026, 8, 4), amount_incl_vat: 865 };

    it("formats dates and amount for the letter", () => {
        const built = buildReminderValues(invoice, "Jean Dupont", "DE DONNO STYLE Sàrl", new Date(2026, 8, 24));
        expect(built.montant).toBe("865.00 CHF");
        expect(built.jours_retard).toBe("20");
        expect(built.date_echeance).toContain("2026");
        expect(built.client).toBe("Jean Dupont");
        expect(built.signature_entreprise).toBe("DE DONNO STYLE Sàrl");
    });

    it("leaves the due date and days empty when the invoice has none", () => {
        const built = buildReminderValues({ ...invoice, due_date: null }, "Jean Dupont", "DE DONNO STYLE Sàrl", new Date(2026, 8, 24));
        expect(built.date_echeance).toBe("");
        expect(built.jours_retard).toBe("");
    });

});
