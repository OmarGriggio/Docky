-- Clients and resources numbered the company's own way too (Paramètres >
-- Numérotation, backend/src/modules/numbering): document_numbering becomes
-- numbering, its type CLIENT, MATERIAL or SERVICE as well as QUOTE or
-- INVOICE. No row: the default format - C{NNNN}, MAT{NNNN}, SER{NNNN}, every
-- client number and resource code given out before this.

ALTER TABLE IF EXISTS document_numbering RENAME TO numbering;

ALTER TABLE numbering
    DROP CONSTRAINT IF EXISTS document_numbering_type_check,
    DROP CONSTRAINT IF EXISTS numbering_type_check,
    ADD CONSTRAINT numbering_type_check CHECK (type IN ('QUOTE', 'INVOICE', 'CLIENT', 'MATERIAL', 'SERVICE'));
