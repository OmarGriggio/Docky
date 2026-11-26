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
    // Prices and amounts shown in the modules allowed. Without them, the
    // modules made of amounts are hidden (PRICED_MODULES) and every price is
    // taken out of what the others answer (withoutPrices).
    prices: boolean;
}

// Quotes, invoices and the dashboard are amounts through and through (their
// PDFs too): hidden whenever prices are.
export const PRICED_MODULES: PermissionModule[] = ["quotes", "invoices", "dashboard"];

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
    const showPrices = prices !== false;
    return {
        modules: Object.fromEntries(PERMISSION_MODULES.map(module => {
            if (!showPrices && PRICED_MODULES.includes(module)) {
                return [module, "NONE"];
            }
            const level = Object.prototype.hasOwnProperty.call(given, module) ? given[module] : undefined;
            return [module, isAccessLevel(level) ? level : DEFAULT_EMPLOYEE_PERMISSIONS.modules[module]];
        })) as Record<PermissionModule, AccessLevel>,
        prices: showPrices,
    };
};

// Every field holding a price or an amount, wherever it's answered: a
// resource's prices, a line's price and discount, a document's totals and
// discount, the company's early payment discount.
const PRICE_FIELDS = new Set([
    "unit_price", "selling_price", "purchase_price", "discount",
    "amount_excl_vat", "amount_incl_vat", "early_payment_discount", "early_payment_min_amount",
    // Amounts computed from those - a final invoice's balance, a client's
    // payments, a scanned document's estimate.
    "amount_due", "total_paid", "estimated_amount",
    // A payment reminder's fees.
    "fee", "total_fees",
]);

/** A response body with every price and amount set to null, however deep - for an employee who may not see them. A date is kept as is. */
export const withoutPrices = (value: unknown): unknown => {
    if (Array.isArray(value)) {
        return value.map(withoutPrices);
    }
    if (value === null || typeof value !== "object" || value instanceof Date || Buffer.isBuffer(value)) {
        return value;
    }
    return Object.fromEntries(Object.entries(value).map(([key, field]) =>
        [key, PRICE_FIELDS.has(key) ? null : withoutPrices(field)]));
};

// The module a document belongs to - a chantier's PROJECT document is its
// resource ledger, part of the chantier.
export const moduleOfDocumentType = (type: string): PermissionModule =>
    type === "QUOTE" ? "quotes" : type === "INVOICE" ? "invoices" : "projects";
