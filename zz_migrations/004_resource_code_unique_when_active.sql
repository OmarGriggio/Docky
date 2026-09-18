-- A resource's code only needs to be unique among its company's ACTIVE
-- resources: once archived (see the "archive instead of delete" convention),
-- its code should be free to reuse. The original plain UNIQUE
-- (company_id, code) constraint rejected a new resource whose code matched
-- an archived one, even though that one is hidden in the UI by default.
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_company_id_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS resources_company_id_code_active_key ON resources (company_id, code) WHERE is_active = true;
