-- The user's own preferred UI language (Transloco on the frontend reads/sets
-- this) - a personal setting, not a company-wide one, hence on users rather
-- than companies. Only FR/EN for now.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS language VARCHAR(2) NOT NULL DEFAULT 'FR'
    CHECK (language IN ('FR', 'EN'));

-- A client's own preferred language for correspondence/documents - distinct
-- from the user column above (that one's the logged-in employee's UI
-- language). Covers Switzerland's main business languages, not tied to
-- Transloco's own FR/EN-only UI scope.
ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS language VARCHAR(2) NOT NULL DEFAULT 'FR'
    CHECK (language IN ('FR', 'EN', 'DE', 'IT'));
