-- The date or period of the service an invoice bills (art. 26 al. 2 let. d
-- LTVA - an invoice must say when the work was done): a single date in
-- service_date_start, a period with service_date_end too. Both null for a
-- quote, and for an invoice nobody gave one (it prints nothing then).
-- Editable while the invoice is a draft, like the rest of its header.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS service_date_start DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS service_date_end DATE;
