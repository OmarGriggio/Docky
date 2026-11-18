import { describe, expect, it } from "vitest";
import { allows, DEFAULT_EMPLOYEE_PERMISSIONS, FULL_PERMISSIONS, moduleOfDocumentType, normalizePermissions } from "./permissions";

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
        const permissions = normalizePermissions({ modules: { quotes: "READ" }, prices: false })!;
        expect(permissions.modules.quotes).toBe("READ");
        expect(permissions.modules.projects).toBe("WRITE");
        expect(permissions.modules.dashboard).toBe("NONE");
        expect(permissions.prices).toBe(false);
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

describe("moduleOfDocumentType", () => {
    it("puts a chantier's own document with the chantiers", () => {
        expect(moduleOfDocumentType("QUOTE")).toBe("quotes");
        expect(moduleOfDocumentType("INVOICE")).toBe("invoices");
        expect(moduleOfDocumentType("PROJECT")).toBe("projects");
    });
});
