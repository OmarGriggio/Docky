-- clients.client_number was UNIQUE across every company: a new company's
-- first client "C0001" was refused because another company already had one,
-- and the 409 itself told that company a client number existed elsewhere.
-- A client number only has to be unique within its own company.

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS clients_company_id_client_number_key
    ON clients (company_id, client_number);
