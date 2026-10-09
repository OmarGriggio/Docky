-- The demo company's own admin (company 2, Rénov Alpes - see 001_data.sql's
-- header comment) defaults to the English UI, matching its now-English
-- business data. Can't be set directly in 001_data.sql's own INSERT INTO
-- users - the `language` column (migration 002) doesn't exist yet at that
-- point in a fresh volume's bootstrap sequence (001_data.sql runs before any
-- numbered migration). Idempotent (plain UPDATE, safe to re-run) and applies
-- to an already-initialized database too via runMigrationsServ() - including
-- the current production one, not just a future fresh volume.
UPDATE users SET language = 'EN' WHERE company_id = 2 AND role = 'ADMIN';
