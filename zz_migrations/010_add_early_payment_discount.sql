-- The early payment discount ("escompte") an invoice offers: X% off the
-- total incl. VAT when paid within N days, only from a minimum total incl.
-- VAT up (e.g. 2% within 10 days from CHF 1001.-). 0% means none.
--
-- Same "company default, copied onto each new document" split as vat_rate:
-- the company's own values are copied when an invoice is created (see
-- document.service.ts's addDocumentServ) and frozen there, so changing the
-- company's terms later never rewrites an invoice already issued.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS early_payment_discount NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS early_payment_days INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS early_payment_min_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS early_payment_discount NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS early_payment_days INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS early_payment_min_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
