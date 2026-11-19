-- The template each document is printed with (025_add_templates.sql), and
-- its look frozen once it's sent - like billed_address (016): a draft prints
-- its template as it is now, a quote or invoice sent keeps the look it was
-- sent with whatever its template becomes. Frozen and cleared by
-- document.repository.ts's status changes and accept, never from a request.
--
-- template_id: null only for a chantier's PROJECT document (never printed) -
-- a document without one prints with the company's default template.
-- template_style: { layout, font, accent_color, secondary_color,
-- header_image } - null while the document follows its template.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES templates(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS template_style JSONB;

-- Every quote and invoice there is: its company's Standard template.
UPDATE documents d SET template_id = t.id
FROM templates t
WHERE t.company_id = d.company_id AND t.is_default AND d.template_id IS NULL AND d.type IN ('QUOTE', 'INVOICE');

-- Those already sent: frozen with the look they were sent with - the
-- company's settings until now, now its Standard template.
UPDATE documents d SET template_style = jsonb_build_object(
    'layout', t.layout, 'font', t.font, 'accent_color', t.accent_color,
    'secondary_color', t.secondary_color, 'header_image', t.header_image)
FROM templates t
WHERE t.id = d.template_id AND d.template_style IS NULL AND d.status IS NOT NULL AND d.status <> 'DRAFT';
