import { describe, it, expect } from "vitest";
import { fillPlaceholders } from "./placeholders";
import { buildDocumentValues, DEFAULT_CLIENT_TITLE, PlaceholderSource } from "./document.placeholders";
import { formatLongDate, toPdfLanguage } from "./pdf-labels";

const values = {
    numero_facture: "FAC-2026-0002",
    montant: "865.00 CHF",
    client: "Jean Dupont",
};

describe("fillPlaceholders", () => {

    it("replaces every known placeholder, however many times it appears", () => {
        expect(fillPlaceholders("{{numero_facture}} - {{montant}} ({{numero_facture}})", values))
            .toBe("FAC-2026-0002 - 865.00 CHF (FAC-2026-0002)");
    });

    it("tolerates spaces inside the braces", () => {
        expect(fillPlaceholders("{{ client }}", values)).toBe("Jean Dupont");
    });

    it("leaves an unknown placeholder exactly as typed", () => {
        expect(fillPlaceholders("{{numero_factur}} {{entreprise}} {{CLIENT}}", values))
            .toBe("{{numero_factur}} {{entreprise}} {{CLIENT}}");
    });

    it("fills a placeholder by its English name too", () => {
        expect(fillPlaceholders("{{invoice_number}} - {{ amount }} / {{montant}}", values))
            .toBe("FAC-2026-0002 - 865.00 CHF / 865.00 CHF");
    });

    it("leaves an English name whose value isn't given as typed", () => {
        expect(fillPlaceholders("{{due_date}} {{days_overdue}}", values)).toBe("{{due_date}} {{days_overdue}}");
    });

    it("never resolves a name that is only inherited", () => {
        expect(fillPlaceholders("{{constructor}} {{to_string}}", values)).toBe("{{constructor}} {{to_string}}");
    });

    it("does not scan inserted values again", () => {
        expect(fillPlaceholders("{{client}}", { ...values, client: "{{montant}}" })).toBe("{{montant}}");
    });

});


const sourceOf = (overrides: { title?: string | null; companyName?: string | null; language?: "FR" | "EN" } = {}): PlaceholderSource => ({
    document: { number: "OFF-2026-0012", date: new Date(2026, 8, 24), due_date: new Date(2026, 9, 24), reference_client: " PO-77 ", amount_excl_vat: 1142, amount_incl_vat: 1234.5, payment_terms: "30 jours net" },
    amountDue: 1234.5,
    client: { title: overrides.title === undefined ? "Monsieur" : overrides.title, name: "Jean Dupont", number: "C0012", location: null },
    company: {
        name: overrides.companyName === undefined ? "DE DONNO STYLE Sàrl" : overrides.companyName, street: "Rue de Boujean 37", postal_code: "2502", city: "Biel/Bienne",
        phone: "+41 79 000 00 00", email: "info@dedonno.ch", website: null, iban: "CH93 0076 2011 6238 5295 7", bank_name: "BCBE", bank_account: null, vat_number: "CHE-123.456.789 TVA",
    },
    language: overrides.language ?? "FR",
});

describe("buildDocumentValues", () => {

    it("gives the client title, the date and the amount with CHF", () => {
        const built = buildDocumentValues(sourceOf());
        expect(built.titre_client).toBe("Monsieur");
        expect(built.date).toContain("2026");
        expect(built.montant).toBe("1234.50 CHF");
        expect(built.signature_entreprise).toBe("DE DONNO STYLE Sàrl");
    });

    it("gives the document's, the client's and the company's details", () => {
        expect(buildDocumentValues(sourceOf())).toMatchObject({
            numero_document: "OFF-2026-0012", reference_client: "PO-77", montant_ht: "1142.00 CHF", montant_tva: "92.50 CHF",
            conditions_paiement: "30 jours net", client: "Jean Dupont", numero_client: "C0012", lieu: "",
            adresse_entreprise: "Rue de Boujean 37, 2502 Biel/Bienne", telephone_entreprise: "+41 79 000 00 00",
            email_entreprise: "info@dedonno.ch", site_web: "", iban: "CH93 0076 2011 6238 5295 7", banque: "BCBE",
            compte_bancaire: "", numero_tva: "CHE-123.456.789 TVA",
        });
        expect(buildDocumentValues(sourceOf()).date_echeance).toContain("octobre 2026");
    });

    it("falls back to Madame, Monsieur when the client has no title", () => {
        expect(buildDocumentValues(sourceOf({ title: null, companyName: null })).titre_client).toBe(DEFAULT_CLIENT_TITLE);
        expect(buildDocumentValues(sourceOf({ title: "  " })).titre_client).toBe("Madame, Monsieur");
    });

});

describe("PDF language", () => {

    const document = { date: new Date(2026, 8, 24) };

    it("greets an English client in English when they have no title", () => {
        expect(buildDocumentValues(sourceOf({ title: null, language: "EN" })).titre_client).toBe("Dear Sir or Madam");
    });

    it("formats dates in the client's own language", () => {
        expect(formatLongDate(document.date, "FR")).toBe("24 septembre 2026");
        expect(formatLongDate(document.date, "EN")).toBe("24 September 2026");
    });

    it("falls back to French for a language without labels yet", () => {
        expect(toPdfLanguage("EN")).toBe("EN");
        expect(toPdfLanguage("DE")).toBe("FR");
        expect(toPdfLanguage("IT")).toBe("FR");
    });

});
