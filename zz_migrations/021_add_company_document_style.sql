-- How a company's invoices, quotes and payment reminders are laid out and in
-- which font - chosen on its profile, read when a PDF is printed (like the
-- colors, not frozen per document).
--
-- companies.document_layout: CLASSIC (a page of positions, then the details
-- - the layout every document had before this) or MODERN (every line on page
-- 1 in one table, the totals boxed).
-- companies.document_font: HELVETICA (a PDF standard font, the one used
-- before this), LATO or PT_SERIF (embedded, see backend/src/pdf/core/
-- pdf-fonts.ts). The QR-bill's payment part stays in Helvetica whatever it is.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS document_layout VARCHAR(20) NOT NULL DEFAULT 'CLASSIC';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS document_font VARCHAR(20) NOT NULL DEFAULT 'HELVETICA';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_document_layout_check') THEN
        ALTER TABLE companies ADD CONSTRAINT companies_document_layout_check
            CHECK (document_layout IN ('CLASSIC', 'MODERN'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_document_font_check') THEN
        ALTER TABLE companies ADD CONSTRAINT companies_document_font_check
            CHECK (document_font IN ('HELVETICA', 'LATO', 'PT_SERIF'));
    END IF;
END $$;
