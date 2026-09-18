-- Default VAT rate applied to a new document (see document.types.ts's own
-- vat_rate) - only a starting point, still freely editable per document
-- (and frozen there once set, so a later change here never retroactively
-- changes an already-issued invoice's own rate).
ALTER TABLE companies ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) DEFAULT 8.1;

-- The company's own VAT/UID number (e.g. "CHE-123.456.789 TVA") - nullable,
-- a company under the small-business threshold has none. Shown on an
-- invoice next to the issuer's own address (see backend/src/pdf) - same
-- column shape as clients.vat_number.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS vat_number VARCHAR(20);
