-- Default payment terms for a new document (documents.payment_terms is the
-- one actually used - this is only its starting value, same pattern as
-- vat_rate). TEXT, not VARCHAR - free text, multi-line.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payment_terms TEXT;
