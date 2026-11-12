-- The client's name and address a quote or invoice was sent to, frozen once
-- it leaves DRAFT (see document.service.ts and billed-address.ts), like its
-- VAT rate and early payment discount: a client who moves or is renamed
-- later no longer changes an invoice already sent when it's printed again.
-- Null while it's a draft (printed with the client's current address), and
-- for a document made out to "Non défini" (its recipient is typed on the
-- document itself).
--
-- {"name", "street", "postal_code", "city", "country", "location"} -
-- "location" being the Lieu/Bâtiment (address_id) as printed.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS billed_address JSONB;

-- Documents already past DRAFT get the address they'd print today - the
-- best there is, and from now on it no longer moves.
UPDATE documents d
SET billed_address = (
    SELECT jsonb_build_object(
        'name', COALESCE(NULLIF(c.company_name, ''), TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''))),
        'street', COALESCE(billing.street, ''),
        'postal_code', COALESCE(billing.postal_code, ''),
        'city', COALESCE(billing.city, ''),
        'country', billing.country,
        'location', CASE WHEN loc.id IS NULL THEN NULL
                         ELSE COALESCE(loc.attention || ' : ', '') || loc.street || ', ' || loc.postal_code || ' ' || loc.city END
    )
    FROM clients c
    LEFT JOIN LATERAL (
        SELECT street, postal_code, city, country FROM addresses
        WHERE client_id = c.id AND company_id = c.company_id
        ORDER BY is_primary DESC, id
        LIMIT 1
    ) billing ON true
    LEFT JOIN addresses loc ON loc.id = d.address_id AND loc.client_id = c.id
    WHERE c.id = d.client_id
)
WHERE d.type IN ('QUOTE', 'INVOICE')
  AND d.status IS NOT NULL AND d.status <> 'DRAFT'
  AND d.billed_address IS NULL
  AND EXISTS (SELECT 1 FROM clients c WHERE c.id = d.client_id AND c.is_placeholder = false);
