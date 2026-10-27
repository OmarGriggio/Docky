-- Printed in an invoice's footer next to the company's own address, email,
-- phone and IBAN (see backend/src/pdf): its website (or how to find it, e.g.
-- "Google - Menuiserie De Donno Bienne" - free text), and its bank, short
-- name and account, e.g. "BCBE" / "01-200000-7". All optional.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
