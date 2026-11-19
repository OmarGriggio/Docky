-- What 025_add_templates.sql copied into each company's Standard template,
-- no longer read anywhere: the company's own document look and defaults, and
-- the per type texts of document_templates. The logo stays on the company
-- (its identity, the same on every template).

ALTER TABLE companies DROP COLUMN IF EXISTS document_layout;
ALTER TABLE companies DROP COLUMN IF EXISTS document_font;
ALTER TABLE companies DROP COLUMN IF EXISTS accent_color;
ALTER TABLE companies DROP COLUMN IF EXISTS secondary_color;
ALTER TABLE companies DROP COLUMN IF EXISTS header_image;
ALTER TABLE companies DROP COLUMN IF EXISTS payment_terms;
ALTER TABLE companies DROP COLUMN IF EXISTS early_payment_discount;
ALTER TABLE companies DROP COLUMN IF EXISTS early_payment_days;
ALTER TABLE companies DROP COLUMN IF EXISTS early_payment_min_amount;

DROP TABLE IF EXISTS document_templates;
