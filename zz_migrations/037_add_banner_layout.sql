-- A third layout for templates: BANNER (pdf/templates/banner-letter.ts) - a
-- band of the title's color across the top, the document's details in a
-- framed grid, a table per section. The check on templates.layout lets it
-- in; a sent document's frozen look (documents.template_style) has no check.

ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_layout_check;
ALTER TABLE templates ADD CONSTRAINT templates_layout_check CHECK (layout IN ('CLASSIC', 'MODERN', 'BANNER'));
