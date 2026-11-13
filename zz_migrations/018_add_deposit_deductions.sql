-- A chantier's final invoice deducts its deposit invoices (017_add_invoice_kind.sql,
-- see deposit.ts): which ones, frozen once it leaves DRAFT, like its address
-- and VAT rate - [{ "document_id", "number", "date", "amount_incl_vat" }].
-- Null for a draft (worked out from the chantier's deposits as they stand)
-- and for any other document.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS deposit_deductions JSONB;
