// What an employee (the USER role) may do, module by module - set by the
// company's admin (Paramètres > Droits des employés), enforced on every route
// (permission.middleware.ts). Pure: tested on its own (permissions.test.ts).
// ADMIN and PLATFORM_ADMIN aren't bound by it.

export const PERMISSION_MODULES = ["clients", "catalog", "quotes", "invoices", "projects", "calendar", "dashboard"] as const;
export type PermissionModule = typeof PERMISSION_MODULES[number];

// NONE: the module is hidden; READ: shown, nothing changed; WRITE: everything.
export const ACCESS_LEVELS = ["NONE", "READ", "WRITE"] as const;
export type AccessLevel = typeof ACCESS_LEVELS[number];

export interface Permissions {
    modules: Record<PermissionModule, AccessLevel>;
    // Prices and amounts shown in the modules allowed.
    prices: boolean;
}

// An admin's: everything.
export const FULL_PERMISSIONS: Permissions = {
    modules: Object.fromEntries(PERMISSION_MODULES.map(module => [module, "WRITE"])) as Record<PermissionModule, AccessLevel>,
    prices: true,
};

// An employee's while the admin hasn't set any - what they could already do
// before permissions existed: every module but the dashboard (company-wide
// figures) and the calendar (planning), both an admin's until then.
export const DEFAULT_EMPLOYEE_PERMISSIONS: Permissions = {
    modules: { ...FULL_PERMISSIONS.modules, dashboard: "NONE", calendar: "NONE" },
    prices: true,
};

const RANK: Record<AccessLevel, number> = { NONE: 0, READ: 1, WRITE: 2 };

export const allows = (permissions: Permissions, module: PermissionModule, level: AccessLevel): boolean =>
    RANK[permissions.modules[module]] >= RANK[level];

const isAccessLevel = (value: unknown): value is AccessLevel => (ACCESS_LEVELS as readonly unknown[]).includes(value);

/** Permissions as sent by the settings page, or as stored: a module missing or with an unknown level gets its default (DEFAULT_EMPLOYEE_PERMISSIONS); anything that isn't an object at all is refused (null). */
export const normalizePermissions = (input: unknown): Permissions | null => {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
        return null;
    }
    const { modules, prices } = input as { modules?: unknown; prices?: unknown };
    const given = typeof modules === "object" && modules !== null && !Array.isArray(modules) ? modules as Record<string, unknown> : {};
    return {
        modules: Object.fromEntries(PERMISSION_MODULES.map(module => {
            const level = Object.prototype.hasOwnProperty.call(given, module) ? given[module] : undefined;
            return [module, isAccessLevel(level) ? level : DEFAULT_EMPLOYEE_PERMISSIONS.modules[module]];
        })) as Record<PermissionModule, AccessLevel>,
        prices: prices !== false,
    };
};

// The module a document belongs to - a chantier's PROJECT document is its
// resource ledger, part of the chantier.
export const moduleOfDocumentType = (type: string): PermissionModule =>
    type === "QUOTE" ? "quotes" : type === "INVOICE" ? "invoices" : "projects";
