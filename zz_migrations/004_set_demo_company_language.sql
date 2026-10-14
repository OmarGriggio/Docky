-- The demo company's own admin and clients (company 2, Rénov Alpes - see
-- 001_data.sql's header comment) default to English, matching its now-
-- English business data. Can't be set directly in 001_data.sql's own
-- INSERT statements - the `language` columns (migration 002) don't exist
-- yet at that point in a fresh volume's bootstrap sequence (001_data.sql
-- runs before any numbered migration). Idempotent (plain UPDATEs, safe to
-- re-run) and applies to an already-initialized database too via
-- runMigrationsServ() - including the current production one, not just a
-- future fresh volume.
UPDATE users SET language = 'EN' WHERE company_id = 2 AND role = 'ADMIN';
UPDATE clients SET language = 'EN' WHERE company_id = 2;
