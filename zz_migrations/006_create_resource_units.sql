CREATE TABLE IF NOT EXISTS resource_units (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    label VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE (company_id, label),

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);

-- Every existing company starts with the same small default list - a
-- resource/document line's own "unit" column stays free text for now, this
-- table is just the customizable list a future picker will read from.
-- ON CONFLICT keeps this safe to re-run (already-seeded company, or a
-- company that added/renamed one of these itself since).
INSERT INTO resource_units (company_id, label)
SELECT c.id, u.label
FROM companies c
CROSS JOIN (VALUES ('Heure'), ('m'), ('m²'), ('kg'), ('pièce')) AS u(label)
ON CONFLICT (company_id, label) DO NOTHING;
