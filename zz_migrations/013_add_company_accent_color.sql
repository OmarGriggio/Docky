-- The company's own color ("#b8860b"), picked on its profile: invoices and
-- quotes print their total, early payment line, payment conditions heading
-- and footer details in it. Null means none - the PDFs stay black and white.
--
-- Read when a PDF is generated, not copied onto each document: an invoice
-- printed again after the color changed comes out in the new one.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7);
