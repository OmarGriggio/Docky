-- Every payment reminder sent for an invoice ("Envoyer le rappel n"), one row
-- per level reached - what the dashboard's "Factures à relancer" and the next
-- level's due date are worked out from, and what its PDF is printed again
-- from, the same as it was sent:
--   date            the day it was sent - the letter's date, {{jours_retard}}
--   fee             this level's fee (CHF), total_fees with the earlier ones'
--   amount_due      what the invoice still asked for then (incl. VAT, deposits
--                   deducted) - the QR-bill asks for it plus total_fees
--   text            the template's text of that level, raw ({{placeholders}})
--   billed_address  the client's address then (billed-address.ts) - null for
--                   a typed-in recipient, already on the invoice
-- Never written from a request. Only the latest of an invoice can be taken
-- back (a reminder created by mistake).

CREATE TABLE IF NOT EXISTS invoice_reminders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
    date DATE NOT NULL,
    fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_fees NUMERIC(10,2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(12,2) NOT NULL,
    text TEXT NOT NULL,
    billed_address JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, level)
);

CREATE INDEX IF NOT EXISTS invoice_reminders_company_idx ON invoice_reminders (company_id);
