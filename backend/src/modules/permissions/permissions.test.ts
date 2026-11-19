import { describe, expect, it } from "vitest";
import { allows, DEFAULT_EMPLOYEE_PERMISSIONS, FULL_PERMISSIONS, moduleOfDocumentType, normalizePermissions, withoutPrices } from "./permissions";

describe("allows", () => {
    const permissions = normalizePermissions({ modules: { invoices: "NONE", calendar: "READ" } })!;

    it("lets WRITE do everything, READ only read, NONE nothing", () => {
        expect(allows(permissions, "clients", "WRITE")).toBe(true);
        expect(allows(permissions, "calendar", "READ")).toBe(true);
        expect(allows(permissions, "calendar", "WRITE")).toBe(false);
        expect(allows(permissions, "invoices", "READ")).toBe(false);
    });

    it("lets an admin do everything", () => {
        expect(allows(FULL_PERMISSIONS, "dashboard", "WRITE")).toBe(true);
        expect(FULL_PERMISSIONS.prices).toBe(true);
    });

    it("lets an employee of a company without settings do what they always could", () => {
        expect(allows(DEFAULT_EMPLOYEE_PERMISSIONS, "invoices", "WRITE")).toBe(true);
        expect(allows(DEFAULT_EMPLOYEE_PERMISSIONS, "dashboard", "READ")).toBe(false);
        expect(allows(DEFAULT_EMPLOYEE_PERMISSIONS, "calendar", "READ")).toBe(false);
    });
});

describe("normalizePermissions", () => {
    it("keeps the levels given and completes the rest with the defaults", () => {
        const permissions = normalizePermissions({ modules: { quotes: "READ" }, prices: true })!;
        expect(permissions.modules.quotes).toBe("READ");
        expect(permissions.modules.projects).toBe("WRITE");
        expect(permissions.modules.dashboard).toBe("NONE");
        expect(permissions.prices).toBe(true);
    });

    it("ignores unknown levels and modules, and anything inherited", () => {
        const permissions = normalizePermissions({ modules: { quotes: "ADMIN", payroll: "NONE", constructor: "NONE" } })!;
        expect(permissions.modules.quotes).toBe("WRITE");
        expect(permissions.modules).not.toHaveProperty("payroll");
        expect(permissions.prices).toBe(true);
    });

    it("refuses what isn't an object", () => {
        expect(normalizePermissions(null)).toBeNull();
        expect(normalizePermissions("WRITE")).toBeNull();
        expect(normalizePermissions([])).toBeNull();
    });
});

describe("prices hidden", () => {
    it("hide the modules made of amounts, whatever they were set to", () => {
        const permissions = normalizePermissions({ modules: { quotes: "WRITE", invoices: "READ", dashboard: "READ", projects: "WRITE" }, prices: false })!;
        expect(permissions.modules).toMatchObject({ quotes: "NONE", invoices: "NONE", dashboard: "NONE", projects: "WRITE", catalog: "WRITE" });
        expect(permissions.prices).toBe(false);
    });

    it("take every price and amount out of a response, however deep, dates kept", () => {
        const date = new Date("2026-11-19T00:00:00Z");
        expect(withoutPrices([{ id: 1, name: "Tuile", selling_price: "3.20", purchase_price: null, created_at: date }]))
            .toEqual([{ id: 1, name: "Tuile", selling_price: null, purchase_price: null, created_at: date }]);
        expect(withoutPrices({ document: { amount_excl_vat: 10, amount_incl_vat: 10.81, discount: 5 }, sections: [{ title: "A", lines: [{ quantity: 2, unit_price: 5 }] }] }))
            .toEqual({ document: { amount_excl_vat: null, amount_incl_vat: null, discount: null }, sections: [{ title: "A", lines: [{ quantity: 2, unit_price: null }] }] });
        expect(withoutPrices({ modules: { quotes: "NONE" }, prices: false })).toEqual({ modules: { quotes: "NONE" }, prices: false });
    });
});

describe("moduleOfDocumentType", () => {
    it("puts a chantier's own document with the chantiers", () => {
        expect(moduleOfDocumentType("QUOTE")).toBe("quotes");
        expect(moduleOfDocumentType("INVOICE")).toBe("invoices");
        expect(moduleOfDocumentType("PROJECT")).toBe("projects");
    });
});
