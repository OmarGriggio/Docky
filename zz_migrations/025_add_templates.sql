-- Document templates ("Modèles", Paramètres > Modèles, backend/src/modules/
-- templates): everything a quote's, an invoice's and a reminder's look and
-- default texts come from, in one place, several per company - each document
-- picks one (026_add_document_template.sql), one is the company's default.
-- Replaces what used to be spread over the company's profile (colors, layout,
-- font, header image, payment terms, early payment discount) and
-- document_templates (introduction/conclusion/due days per type, the
-- reminder's text) - both dropped by 027_drop_old_document_settings.sql once
-- copied here.
--
-- Every company gets one "Standard" template, its default, holding exactly
-- what it had set until now - nothing changes on its documents.

CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    -- New documents start from it - exactly one active per company
    -- (templates_one_default below; the service keeps it that way).
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- The look, read when a draft is printed and frozen onto a document once
    -- it's sent (documents.template_style).
    layout VARCHAR(20) NOT NULL DEFAULT 'CLASSIC' CHECK (layout IN ('CLASSIC', 'MODERN')),
    font VARCHAR(20) NOT NULL DEFAULT 'HELVETICA' CHECK (font IN ('HELVETICA', 'LATO', 'PT_SERIF')),
    accent_color VARCHAR(7),
    secondary_color VARCHAR(7),
    -- A storage key built by its own upload route, never from a request.
    header_image VARCHAR(255),

    -- Copied onto a new document (its own columns are what's printed).
    quote_introduction TEXT,
    quote_conclusion TEXT,
    quote_due_days INTEGER CHECK (quote_due_days IS NULL OR quote_due_days >= 0),
    invoice_introduction TEXT,
    invoice_conclusion TEXT,
    invoice_due_days INTEGER CHECK (invoice_due_days IS NULL OR invoice_due_days >= 0),
    payment_terms TEXT,
    early_payment_discount NUMERIC(5,2) NOT NULL DEFAULT 0,
    early_payment_days INTEGER,
    early_payment_min_amount NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Read every time a reminder is printed - null or blank: the default
    -- text in the client's language.
    reminder_text TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS templates_one_default
    ON templates (company_id) WHERE is_default AND is_active;

-- One "Standard" template per company, from its current settings - only for
-- a company that has none yet (harmless to run again).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'document_layout') THEN
        INSERT INTO templates (
            company_id, name, is_default, layout, font, accent_color, secondary_color, header_image,
            quote_introduction, quote_conclusion, quote_due_days,
            invoice_introduction, invoice_conclusion, invoice_due_days,
            payment_terms, early_payment_discount, early_payment_days, early_payment_min_amount, reminder_text
        )
        SELECT c.id, 'Standard', true, c.document_layout, c.document_font, c.accent_color, c.secondary_color, c.header_image,
            -- No texts saved for a type: the greeting and the signature a new
            -- document started from until now (template.defaults.ts).
            CASE WHEN q.id IS NULL THEN E'{{titre_client}},

' ELSE q.introduction END,
            CASE WHEN q.id IS NULL THEN '{{signature_entreprise}}' ELSE q.conclusion END, q.due_days,
            CASE WHEN i.id IS NULL THEN E'{{titre_client}},

' ELSE i.introduction END,
            CASE WHEN i.id IS NULL THEN '{{signature_entreprise}}' ELSE i.conclusion END, i.due_days,
            c.payment_terms, c.early_payment_discount, c.early_payment_days, c.early_payment_min_amount, r.introduction
        FROM companies c
        LEFT JOIN document_templates q ON q.company_id = c.id AND q.type = 'QUOTE'
        LEFT JOIN document_templates i ON i.company_id = c.id AND i.type = 'INVOICE'
        LEFT JOIN document_templates r ON r.company_id = c.id AND r.type = 'REMINDER'
        WHERE NOT EXISTS (SELECT 1 FROM templates t WHERE t.company_id = c.id);
    END IF;
END $$;
