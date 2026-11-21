-- Whether a template's PDFs print the currency ("CHF") - only ever on the
-- total's line, the positions and amounts elsewhere without it. Off by
-- default. Part of the look frozen on a document once it's sent
-- (documents.template_style's show_currency - a look frozen before this has
-- none, read as off).

ALTER TABLE templates ADD COLUMN IF NOT EXISTS show_currency BOOLEAN NOT NULL DEFAULT false;
