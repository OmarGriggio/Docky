import { describe, it, expect } from "vitest";
import { buildReminderValues, daysOverdue } from "./reminder.placeholders";
import { PlaceholderSource } from "./document.placeholders";

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

    const invoice = { number: "FAC-2026-0002", date: new Date(2026, 7, 5), due_date: new Date(2026, 8, 4) as Date | null, reference_client: null, amount_excl_vat: 800, amount_incl_vat: 865, payment_terms: null };
    const sourceOf = (document = invoice): PlaceholderSource => ({
        document, amountDue: 865, language: "FR",
        client: { title: null, name: "Jean Dupont", number: "C0001", location: null },
        company: { name: "DE DONNO STYLE Sàrl", street: null, postal_code: null, city: null, phone: null, email: null, website: null, iban: null, bank_name: null, bank_account: null, vat_number: null },
    });

    it("formats dates and amount for the letter", () => {
        const built = buildReminderValues(sourceOf(), new Date(2026, 8, 24));
        expect(built.numero_facture).toBe("FAC-2026-0002");
        expect(built.numero_document).toBe("FAC-2026-0002");
        expect(built.montant).toBe("865.00 CHF");
        expect(built.jours_retard).toBe("20");
        expect(built.date_echeance).toContain("2026");
        expect(built.client).toBe("Jean Dupont");
        expect(built.signature_entreprise).toBe("DE DONNO STYLE Sàrl");
    });

    it("leaves the due date and days empty when the invoice has none", () => {
        const built = buildReminderValues(sourceOf({ ...invoice, due_date: null }), new Date(2026, 8, 24));
        expect(built.date_echeance).toBe("");
        expect(built.jours_retard).toBe("");
    });

});
