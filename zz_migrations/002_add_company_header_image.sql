-- Shown at the very top of a generated invoice (see backend/src/pdf) -
-- distinct from the logo, which stays in its own top-right corner slot.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS header_image VARCHAR(255);
