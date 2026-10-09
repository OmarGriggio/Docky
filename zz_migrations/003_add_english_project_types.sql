-- English counterparts of the 8 French project_types (see 001_data.sql) -
-- project_types is a global lookup table (no company_id), shared by every
-- tenant, so the demo company's own projects can't just have their existing
-- French rows translated in place without changing company 1's too. These
-- new rows exist purely so the demo company (company 2, Rénov Alpes - see
-- CLAUDE.md's Seed data bullet) can reference English-labeled types instead,
-- as part of giving it fully English content for English-speaking recruiters.
-- ON CONFLICT (label) DO NOTHING: idempotent both against a re-run and
-- against 001_data.sql itself creating these same rows on a brand-new volume
-- (see that file's own PROJECT TYPES section).
INSERT INTO project_types (label)
VALUES
('Door'),
('Kitchens'),
('Bathroom'),
('Repair'),
('Insulation'),
('Other'),
('Roofing'),
('Windows')
ON CONFLICT (label) DO NOTHING;
