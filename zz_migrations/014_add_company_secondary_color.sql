-- The company's second color ("#1f6fb2"), next to accent_color (013): an
-- invoice's or quote's title and its underline, the detail pages' heading and
-- section titles, and a quote's "Bon pour accord". Null means none - those
-- stay black. Read when a PDF is generated, like accent_color.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7);
