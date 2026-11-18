-- A company's own numbering of its quotes and invoices (see backend/src/
-- modules/documents/document-number-format.ts), set on Paramètres >
-- Numérotation. No row: the default formats, OFF-{YYYY}-{NNNN} and
-- FAC-{YYYY}-{NNNN}, every number given out before this.
--
-- number_format: literal text, {YYYY}/{YY} and one {N...} sequence.
-- start_number: the sequence never starts below it - the number a company
-- moving to Docky continues from - for start_year only when the format has
-- the year in it (the sequence starts again at 1 the next year). Null: 1.
-- The next number is still the highest given out with the format plus one
-- (no counter - see zz_docs/Decisions.md), never one already taken.

CREATE TABLE IF NOT EXISTS document_numbering (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('QUOTE', 'INVOICE')),
    number_format VARCHAR(30) NOT NULL,
    start_number INTEGER CHECK (start_number IS NULL OR start_number BETWEEN 1 AND 99999999),
    start_year INTEGER,
    UNIQUE (company_id, type)
);
