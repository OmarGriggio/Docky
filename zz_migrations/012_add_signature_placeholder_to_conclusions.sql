-- The company's name signing off an invoice/quote used to be printed
-- automatically under its conclusion; it now comes from a
-- {{signature_entreprise}} placeholder written in the conclusion text itself
-- (filled in at PDF time, see backend/src/pdf/templates/document.placeholders.ts).
-- So existing documents and templates keep printing it:
--   * a conclusion already ending in a hand-typed signature (the literal
--     "Nom de l'entreprise", or the company's own name) gets that trailing
--     text replaced by the placeholder, keeping its indentation;
--   * any other QUOTE/INVOICE conclusion gets the placeholder appended on its
--     own line (or becomes just the placeholder if it was empty).
-- Safe to re-run: anything already containing the placeholder is skipped.
-- A REMINDER template keeps its own separate signature line.
UPDATE documents AS d
SET conclusion = CASE
        WHEN RIGHT(RTRIM(d.conclusion, E' \t\r\n'), length('Nom de l''entreprise')) = 'Nom de l''entreprise'
            THEN LEFT(RTRIM(d.conclusion, E' \t\r\n'), length(RTRIM(d.conclusion, E' \t\r\n')) - length('Nom de l''entreprise')) || '{{signature_entreprise}}'
        WHEN COALESCE(c.name, '') <> '' AND RIGHT(RTRIM(d.conclusion, E' \t\r\n'), length(c.name)) = c.name
            THEN LEFT(RTRIM(d.conclusion, E' \t\r\n'), length(RTRIM(d.conclusion, E' \t\r\n')) - length(c.name)) || '{{signature_entreprise}}'
        WHEN COALESCE(BTRIM(d.conclusion), '') = '' THEN '{{signature_entreprise}}'
        ELSE d.conclusion || E'\n\n' || '{{signature_entreprise}}'
    END
FROM companies AS c
WHERE c.id = d.company_id
  AND d.type IN ('QUOTE', 'INVOICE')
  AND COALESCE(d.conclusion, '') NOT LIKE '%{{signature_entreprise}}%';

UPDATE document_templates AS t
SET conclusion = CASE
        WHEN RIGHT(RTRIM(t.conclusion, E' \t\r\n'), length('Nom de l''entreprise')) = 'Nom de l''entreprise'
            THEN LEFT(RTRIM(t.conclusion, E' \t\r\n'), length(RTRIM(t.conclusion, E' \t\r\n')) - length('Nom de l''entreprise')) || '{{signature_entreprise}}'
        WHEN COALESCE(c.name, '') <> '' AND RIGHT(RTRIM(t.conclusion, E' \t\r\n'), length(c.name)) = c.name
            THEN LEFT(RTRIM(t.conclusion, E' \t\r\n'), length(RTRIM(t.conclusion, E' \t\r\n')) - length(c.name)) || '{{signature_entreprise}}'
        WHEN COALESCE(BTRIM(t.conclusion), '') = '' THEN '{{signature_entreprise}}'
        ELSE t.conclusion || E'\n\n' || '{{signature_entreprise}}'
    END
FROM companies AS c
WHERE c.id = t.company_id
  AND t.type IN ('QUOTE', 'INVOICE')
  AND COALESCE(t.conclusion, '') NOT LIKE '%{{signature_entreprise}}%';
