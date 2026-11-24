-- One reminder text per level on a template: reminder_text stays the 1st
-- reminder's, these are the 2nd reminder's and the formal notice's. Null or
-- blank: the default text of that level in the client's language
-- (template.defaults.ts).

ALTER TABLE templates ADD COLUMN IF NOT EXISTS reminder_text_2 TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS reminder_text_3 TEXT;
