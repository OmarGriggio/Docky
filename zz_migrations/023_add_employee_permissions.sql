-- What a company's employees (the USER role) may do, set by its admin on
-- Paramètres > Droits des employés (backend/src/modules/permissions). One row
-- per company at most - none: every module modifiable and prices shown, what
-- an employee could do before this. ADMIN and PLATFORM_ADMIN aren't bound by
-- it.
--
-- permissions: { "modules": { "clients": "NONE" | "READ" | "WRITE", ... },
-- "prices": true | false } - checked and completed by permissions.ts's
-- normalizePermissions before it's stored.

CREATE TABLE IF NOT EXISTS employee_permissions (
    company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    permissions JSONB NOT NULL
);
