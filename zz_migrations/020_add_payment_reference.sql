-- Payment references on QR-bills, so an incoming payment can be matched to
-- its invoice (see backend/src/pdf/swiss-qr-bill/payment-reference.ts).
--
-- companies.qr_iban: an optional QR-IBAN - when set, invoices' QR-bills are
-- paid to it with a QR reference (QRR, which a QR-IBAN requires); the
-- ordinary IBAN stays the one printed in the footer.
-- companies.payment_reference_type: without a QR-IBAN, a creditor reference
-- (SCOR, "RF..." - the default) or none (NONE).
-- documents.payment_reference: an invoice's reference, frozen once it leaves
-- DRAFT like its address - "RF..." or 27 digits. Null for a draft (worked
-- out from the company's settings as they stand), and for an invoice sent
-- without one (every invoice sent before this migration).

ALTER TABLE companies ADD COLUMN IF NOT EXISTS qr_iban VARCHAR(22);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payment_reference_type VARCHAR(10) NOT NULL DEFAULT 'SCOR';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_payment_reference_type_check') THEN
        ALTER TABLE companies ADD CONSTRAINT companies_payment_reference_type_check
            CHECK (payment_reference_type IN ('SCOR', 'NONE'));
    END IF;
END $$;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(27);
