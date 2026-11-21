-- A document sent before 030_add_template_show_currency.sql printed "CHF" on
-- every amount; its frozen look has no show_currency and would now print
-- none at all. It keeps the currency, on its total's line (where a template
-- that shows it puts it). Documents frozen since then carry their template's
-- own setting and are left alone.

UPDATE documents
SET template_style = template_style || '{"show_currency": true}'::jsonb
WHERE template_style IS NOT NULL
  AND NOT (template_style ? 'show_currency');
