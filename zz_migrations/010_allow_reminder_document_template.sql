-- A third kind of default text: the payment reminder PDF's own body (its
-- whole text lives in `introduction`, with {{placeholders}} filled in at PDF
-- time - see backend/src/pdf/templates/reminder.placeholders.ts). Not a
-- document type (a reminder isn't a documents row), only a template type.
-- The constraint was created inline in 000_base.sql, hence Postgres' own
-- default name for it.
ALTER TABLE document_templates DROP CONSTRAINT IF EXISTS document_templates_type_check;
ALTER TABLE document_templates ADD CONSTRAINT document_templates_type_check
    CHECK (type IN ('QUOTE', 'INVOICE', 'REMINDER'));
