-- Deposit invoices ("factures d'acompte"): a chantier can be invoiced in
-- deposits, at any time, before its one final invoice - which deducts them
-- (see document.service.ts and deposit.ts). An invoice is STANDARD (every
-- invoice until now, and a chantier's final one) or DEPOSIT. Meaningless on
-- a quote or a chantier's own PROJECT document, left STANDARD there.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS invoice_kind VARCHAR(10) NOT NULL DEFAULT 'STANDARD';

DO $$
BEGIN
    ALTER TABLE documents ADD CONSTRAINT documents_invoice_kind_check CHECK (invoice_kind IN ('STANDARD', 'DEPOSIT'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
