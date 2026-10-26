-- The recipient typed by hand on a quote/invoice made out to the "Non défini"
-- placeholder client (see 007_add_placeholder_client.sql) - printed on the
-- PDF and its QR-bill in place of a client's own name and address. Null on a
-- document for a real client. Country is always Switzerland for now, so no
-- column for it; postcode and town are kept apart (the QR-bill's structured
-- address format needs them separate).

ALTER TABLE documents ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(70);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS recipient_complement VARCHAR(70);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS recipient_street VARCHAR(70);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS recipient_postal_code VARCHAR(16);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS recipient_city VARCHAR(35);
