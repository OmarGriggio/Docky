-- A client's VAT number was stored and shown but never printed nor used
-- anywhere - only the company's own one goes on the invoices
-- (companies.vat_number). Dropped with its field in the client form.
ALTER TABLE clients DROP COLUMN IF EXISTS vat_number;
