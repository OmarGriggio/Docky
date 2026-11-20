-- A template's two fixed colors, copied into its palette and element colors
-- by 028_add_template_palette.sql - no longer read anywhere.

ALTER TABLE templates DROP COLUMN IF EXISTS accent_color;
ALTER TABLE templates DROP COLUMN IF EXISTS secondary_color;
