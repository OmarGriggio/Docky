import { describe, it, expect } from "vitest";
import { fillPlaceholders } from "./placeholders";
import { buildDocumentValues, DEFAULT_CLIENT_TITLE } from "./document.placeholders";

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

    it("never resolves a name that is only inherited", () => {
        expect(fillPlaceholders("{{constructor}} {{to_string}}", values)).toBe("{{constructor}} {{to_string}}");
    });

    it("does not scan inserted values again", () => {
        expect(fillPlaceholders("{{client}}", { ...values, client: "{{montant}}" })).toBe("{{montant}}");
    });

});


describe("buildDocumentValues", () => {

    const document = { date: new Date(2026, 8, 24), amount_incl_vat: 1234.5 };

    it("gives the client title, the date and the amount with CHF", () => {
        const built = buildDocumentValues(document, "Monsieur", "DE DONNO STYLE Sàrl");
        expect(built.titre_client).toBe("Monsieur");
        expect(built.date).toContain("2026");
        expect(built.montant).toBe("1234.50 CHF");
        expect(built.signature_entreprise).toBe("DE DONNO STYLE Sàrl");
    });

    it("falls back to Madame, Monsieur when the client has no title", () => {
        expect(buildDocumentValues(document, null, null).titre_client).toBe(DEFAULT_CLIENT_TITLE);
        expect(buildDocumentValues(document, "  ", null).titre_client).toBe("Madame, Monsieur");
    });

});
