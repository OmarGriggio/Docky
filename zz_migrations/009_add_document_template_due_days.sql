-- Default due date offset (in days after the document date) for a new
-- document of this type - documents.due_date is the one actually used, this
-- is only its starting value, same pattern as companies.payment_terms. For
-- a QUOTE it means "valid for N days". NULL = no default due date.
ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS due_days INTEGER
    CHECK (due_days IS NULL OR due_days >= 0);
