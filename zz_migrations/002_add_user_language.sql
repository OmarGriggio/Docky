-- The user's own preferred UI language (Transloco on the frontend reads/sets
-- this) - a personal setting, not a company-wide one, hence on users rather
-- than companies. Only FR/EN for now.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS language VARCHAR(2) NOT NULL DEFAULT 'FR'
    CHECK (language IN ('FR', 'EN'));
