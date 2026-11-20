-- A template's colors, per element (backend/src/modules/templates): a
-- palette of up to 5 named colors, and for each element of a PDF (its
-- title, the total's band, the footer, the body text...) the palette color
-- it's printed in - none: black, or gray for a band. A text's [c1]...[c5] /
-- [f1]...[f5] (pdf/templates/rich-text.ts) are the palette's colors too.
-- Replaces the template's two fixed colors (accent_color, secondary_color),
-- dropped by 029_drop_template_two_colors.sql once copied here.
--
-- palette: [{ "name": "Vert", "color": "#037a3f" }, ...]
-- element_colors: { "title": 2, "total": 1, ... } - a palette position,
-- from 1. An element left out has none.

ALTER TABLE templates ADD COLUMN IF NOT EXISTS palette JSONB NOT NULL DEFAULT '[]';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS element_colors JSONB NOT NULL DEFAULT '{}';

-- What a template's two colors colored until now, as palette positions: the
-- main one 1, the secondary one 2 - a text's [c1]/[c2] keep printing the
-- same color. Without a main color but with a secondary one, position 1 is
-- black (what [c1] printed then) and no element uses it.
CREATE OR REPLACE FUNCTION pg_temp.palette_of(accent TEXT, secondary TEXT) RETURNS JSONB AS $$
    SELECT CASE
        WHEN accent IS NULL AND secondary IS NULL THEN '[]'::jsonb
        WHEN secondary IS NULL THEN jsonb_build_array(jsonb_build_object('name', 'Couleur principale', 'color', accent))
        ELSE jsonb_build_array(
            jsonb_build_object('name', 'Couleur principale', 'color', COALESCE(accent, '#000000')),
            jsonb_build_object('name', 'Couleur secondaire', 'color', secondary))
    END;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION pg_temp.elements_of(accent TEXT, secondary TEXT) RETURNS JSONB AS $$
    SELECT
        CASE WHEN accent IS NULL THEN '{}'::jsonb ELSE jsonb_build_object(
            'tableHeader', 1, 'total', 1, 'earlyPayment', 1, 'conditionsHeading', 1, 'scaleEarly', 1, 'footer', 1) END
        || CASE WHEN secondary IS NULL THEN '{}'::jsonb ELSE jsonb_build_object(
            'title', 2, 'companyName', 2, 'sectionTitles', 2, 'approval', 2, 'scaleNet', 2) END;
$$ LANGUAGE SQL IMMUTABLE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'accent_color') THEN
        UPDATE templates SET
            palette = pg_temp.palette_of(accent_color, secondary_color),
            element_colors = pg_temp.elements_of(accent_color, secondary_color)
        WHERE palette = '[]'::jsonb AND element_colors = '{}'::jsonb;
    END IF;
END $$;

-- The documents already sent keep their look: their frozen two colors
-- become the same palette and elements.
UPDATE documents SET template_style = (template_style - 'accent_color' - 'secondary_color')
    || jsonb_build_object(
        'palette', pg_temp.palette_of(template_style->>'accent_color', template_style->>'secondary_color'),
        'element_colors', pg_temp.elements_of(template_style->>'accent_color', template_style->>'secondary_color'))
WHERE template_style IS NOT NULL AND NOT template_style ? 'palette';
