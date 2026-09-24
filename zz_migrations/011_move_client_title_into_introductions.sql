-- The client's title ("Monsieur") used to be printed automatically above an
-- invoice's/quote's introduction; it now comes from a {{titre_client}}
-- placeholder written in the introduction text itself (filled in at PDF time,
-- see backend/src/pdf/templates/document.placeholders.ts). So that existing
-- documents and templates keep printing it, prepend "{{titre_client}}," to
-- every QUOTE/INVOICE introduction that doesn't already use it. Safe to
-- re-run: anything already containing the placeholder is skipped. PROJECT
-- documents have no printed introduction, and a REMINDER template keeps its
-- own separate title line.
UPDATE documents
SET introduction = CASE
        WHEN COALESCE(BTRIM(introduction), '') = '' THEN '{{titre_client}},'
        ELSE '{{titre_client}},' || E'\n\n' || introduction
    END
WHERE type IN ('QUOTE', 'INVOICE')
  AND COALESCE(introduction, '') NOT LIKE '%{{titre_client}}%';

UPDATE document_templates
SET introduction = CASE
        WHEN COALESCE(BTRIM(introduction), '') = '' THEN '{{titre_client}},'
        ELSE '{{titre_client}},' || E'\n\n' || introduction
    END
WHERE type IN ('QUOTE', 'INVOICE')
  AND COALESCE(introduction, '') NOT LIKE '%{{titre_client}}%';
