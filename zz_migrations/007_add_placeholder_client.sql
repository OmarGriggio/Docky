-- A quote or invoice can be made out without picking a client from the list -
-- its recipient's name and address are then typed by hand on the document
-- itself (see 008_add_document_recipient_columns.sql). documents.client_id
-- stays NOT NULL: such a document points at its company's one "Non défini"
-- client, a placeholder that stands for "typed by hand" everywhere a client
-- is needed (PDF greeting and language, dashboard grouping, a chantier's
-- client). Exactly one per company, protected from editing/archiving.
--
-- Its fixed values: greeting "Madame, Monsieur", language FR - what a
-- typed-in recipient's PDF uses. New companies get theirs at registration
-- (see company.service.ts); this backfills the existing ones.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS clients_one_placeholder_per_company
    ON clients (company_id) WHERE is_placeholder = TRUE;

INSERT INTO clients (company_id, client_number, type, company_name, title, language, is_placeholder, is_active)
SELECT c.id, 'NON-DEFINI', 'PROFESSIONAL', 'Non défini', 'Madame, Monsieur', 'FR', TRUE, TRUE
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM clients cl WHERE cl.company_id = c.id AND cl.is_placeholder = TRUE);
