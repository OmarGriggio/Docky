-- Demo data for deposit invoices (017_add_invoice_kind.sql,
-- 018_add_deposit_deductions.sql) - company 2 only, the demo company handed
-- to recruiters: never company 1, which can be a real company's data.
--
-- Two chantiers to look at:
-- - "Attic insulation" (in progress, from quote OFF-...-0005): a deposit of 30 %
--   paid, a second one of 30 % sent - its "Facturation" card fills up, and it
--   can be completed and invoiced to see the final invoice deduct both;
-- - "Facade repainting" (a new chantier, completed): a deposit of CHF 1'081.-
--   paid and its final invoice sent, deducting it - "FACTURE FINALE" and its
--   balance on the PDF and the QR-bill.
--
-- Amounts hand-computed the way the backend computes them (raw SQL bypasses
-- recomputeDocumentTotalsServ): a deposit's line excl. VAT is its amount incl.
-- VAT divided back, its total incl. VAT recomputed from that line. Invoice
-- numbers continue the company's own sequence for the current year, whatever
-- was created since the seed. Past DRAFT, a document carries its frozen
-- billed_address (016) and a final invoice its deposit_deductions (018).
--
-- Idempotent: does nothing once company 2 has a deposit invoice, or without a
-- company 2. scripts/reset-demo-company.sql runs this same block after
-- re-seeding company 2, so it survives the weekly reset.

DO $$
DECLARE
    yr TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    seq INT;
    ch_seq INT;
    template_intro TEXT;
    template_conclusion TEXT;
    terms TEXT;
    attic_doc INT;
    attic_quote documents%ROWTYPE;
    attic_billed JSONB;
    deposit_excl NUMERIC(12,2);
    deposit_incl NUMERIC(12,2);
    doc_id INT;
    section_id INT;
    hotel_client INT;
    hotel_billed JSONB;
    facade_doc INT;
    facade_deposit_id INT;
    facade_deposit_number TEXT;
    facade_section INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = 2)
       OR EXISTS (SELECT 1 FROM documents WHERE company_id = 2 AND invoice_kind = 'DEPOSIT') THEN
        RETURN;
    END IF;

    SELECT COALESCE(MAX(substring(number FROM '^FAC-' || yr || '-([0-9]+)$')::INT), 0) INTO seq
        FROM documents WHERE company_id = 2 AND number LIKE 'FAC-' || yr || '-%';
    SELECT COALESCE(MAX(substring(number FROM '^CH-' || yr || '-([0-9]+)$')::INT), 0) INTO ch_seq
        FROM documents WHERE company_id = 2 AND number LIKE 'CH-' || yr || '-%';
    SELECT introduction, conclusion INTO template_intro, template_conclusion
        FROM document_templates WHERE company_id = 2 AND type = 'INVOICE';
    SELECT payment_terms INTO terms FROM companies WHERE id = 2;

    -- ==========================================
    -- "Attic insulation": two deposits of 30 % of its quote
    -- ==========================================
    SELECT p.document_id INTO attic_doc FROM projects p WHERE p.company_id = 2 AND p.name = 'Attic insulation';
    SELECT q.* INTO attic_quote FROM documents pd JOIN documents q ON q.id = pd.parent_document_id
        WHERE pd.id = attic_doc AND q.type = 'QUOTE';

    IF attic_doc IS NOT NULL AND attic_quote.id IS NOT NULL THEN
        SELECT CASE WHEN a.street IS NULL THEN NULL ELSE jsonb_build_object(
                   'name', COALESCE(NULLIF(c.company_name, ''), TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''))),
                   'street', a.street, 'postal_code', a.postal_code, 'city', a.city, 'country', a.country, 'location', NULL) END
            INTO attic_billed
            FROM clients c
            LEFT JOIN LATERAL (SELECT street, postal_code, city, country FROM addresses
                               WHERE client_id = c.id AND company_id = c.company_id ORDER BY is_primary DESC, id LIMIT 1) a ON true
            WHERE c.id = attic_quote.client_id;

        deposit_excl := ROUND(ROUND(attic_quote.amount_incl_vat * 0.30, 2) / (1 + attic_quote.vat_rate / 100), 2);
        deposit_incl := ROUND(deposit_excl * (1 + attic_quote.vat_rate / 100), 2);

        FOR n IN 1..2 LOOP
            seq := seq + 1;
            INSERT INTO documents (company_id, client_id, address_id, parent_document_id, type, invoice_kind, number, date,
                                   amount_excl_vat, amount_incl_vat, discount, vat_rate, status, introduction, conclusion,
                                   payment_terms, due_date, billed_address)
            VALUES (2, attic_quote.client_id, attic_quote.address_id, attic_doc, 'INVOICE', 'DEPOSIT',
                    'FAC-' || yr || '-' || LPAD(seq::TEXT, 4, '0'),
                    CASE n WHEN 1 THEN CURRENT_DATE - 20 ELSE CURRENT_DATE - 3 END,
                    deposit_excl, deposit_incl, 0, attic_quote.vat_rate,
                    CASE n WHEN 1 THEN 'PAID' ELSE 'SENT' END,
                    template_intro, template_conclusion, terms,
                    CASE n WHEN 1 THEN CURRENT_DATE + 10 ELSE CURRENT_DATE + 27 END, attic_billed)
            RETURNING id INTO doc_id;
            INSERT INTO document_sections (company_id, document_id, position, title, is_active)
            VALUES (2, doc_id, 1, 'Deposit no. ' || n || ' – 30% of quote ' || attic_quote.number, TRUE)
            RETURNING id INTO section_id;
            INSERT INTO document_lines (company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, is_active)
            VALUES (2, doc_id, section_id, 'SERVICE', 1, 'Deposit no. ' || n || ' – 30% of quote ' || attic_quote.number, 1, NULL, deposit_excl, 0, TRUE);
        END LOOP;
    END IF;

    -- ==========================================
    -- "Facade repainting": a deposit paid, then its final invoice deducting it
    -- ==========================================
    SELECT id INTO hotel_client FROM clients WHERE company_id = 2 AND company_name = 'Hôtel du Cervin SA';
    IF hotel_client IS NULL THEN
        RETURN;
    END IF;
    SELECT CASE WHEN a.street IS NULL THEN NULL ELSE jsonb_build_object(
               'name', c.company_name, 'street', a.street, 'postal_code', a.postal_code, 'city', a.city,
               'country', a.country, 'location', NULL) END
        INTO hotel_billed
        FROM clients c
        LEFT JOIN LATERAL (SELECT street, postal_code, city, country FROM addresses
                           WHERE client_id = c.id AND company_id = c.company_id ORDER BY is_primary DESC, id LIMIT 1) a ON true
        WHERE c.id = hotel_client;

    -- The chantier, created by hand (no quote): its ledger, 3'960.- excl. VAT.
    ch_seq := ch_seq + 1;
    INSERT INTO documents (company_id, client_id, type, number, date, amount_excl_vat, amount_incl_vat, discount, vat_rate, status)
    VALUES (2, hotel_client, 'PROJECT', 'CH-' || yr || '-' || LPAD(ch_seq::TEXT, 4, '0'), CURRENT_DATE - 40, 3960, 3960, 0, 0, NULL)
    RETURNING id INTO facade_doc;
    INSERT INTO document_sections (company_id, document_id, position, title, is_active)
    VALUES (2, facade_doc, 1, 'Facade repainting', TRUE) RETURNING id INTO section_id;
    INSERT INTO document_lines (company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, is_active)
    VALUES (2, facade_doc, section_id, 'MATERIAL', 1, 'Facade paint', 120, 'm²', 18, 0, TRUE),
           (2, facade_doc, section_id, 'SERVICE', 2, 'Painter', 40, 'Hour', 45, 0, TRUE);
    INSERT INTO projects (company_id, document_id, client_id, project_type_id, name, note, status, is_active)
    VALUES (2, facade_doc, hotel_client, (SELECT id FROM project_types WHERE label = 'Repair'), 'Facade repainting', NULL, 'COMPLETED', TRUE);

    -- Its deposit: CHF 1'081.- incl. 8.1 % - 1'000.- excl. VAT - paid.
    seq := seq + 1;
    facade_deposit_number := 'FAC-' || yr || '-' || LPAD(seq::TEXT, 4, '0');
    INSERT INTO documents (company_id, client_id, parent_document_id, type, invoice_kind, number, date,
                           amount_excl_vat, amount_incl_vat, discount, vat_rate, status, introduction, conclusion,
                           payment_terms, due_date, billed_address)
    VALUES (2, hotel_client, facade_doc, 'INVOICE', 'DEPOSIT', facade_deposit_number, CURRENT_DATE - 35,
            1000, 1081, 0, 8.1, 'PAID', template_intro, template_conclusion, terms, CURRENT_DATE - 5, hotel_billed)
    RETURNING id INTO facade_deposit_id;
    INSERT INTO document_sections (company_id, document_id, position, title, is_active)
    VALUES (2, facade_deposit_id, 1, 'Deposit no. 1', TRUE) RETURNING id INTO section_id;
    INSERT INTO document_lines (company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, is_active)
    VALUES (2, facade_deposit_id, section_id, 'SERVICE', 1, 'Deposit no. 1', 1, NULL, 1000, 0, TRUE);

    -- Its final invoice, sent: 3'960.- + 8.1 % = 4'280.76, less the deposit's
    -- 1'081.- = 3'199.76 due.
    seq := seq + 1;
    INSERT INTO documents (company_id, client_id, parent_document_id, type, invoice_kind, number, date,
                           amount_excl_vat, amount_incl_vat, discount, vat_rate, status, introduction, conclusion,
                           payment_terms, due_date, billed_address, deposit_deductions)
    VALUES (2, hotel_client, facade_doc, 'INVOICE', 'STANDARD', 'FAC-' || yr || '-' || LPAD(seq::TEXT, 4, '0'), CURRENT_DATE - 2,
            3960, 4280.76, 0, 8.1, 'SENT', template_intro, template_conclusion, terms, CURRENT_DATE + 28, hotel_billed,
            jsonb_build_array(jsonb_build_object('document_id', facade_deposit_id, 'number', facade_deposit_number,
                                                 'date', CURRENT_DATE - 35, 'amount_incl_vat', 1081)))
    RETURNING id INTO doc_id;
    INSERT INTO document_sections (company_id, document_id, position, title, is_active)
    VALUES (2, doc_id, 1, 'Facade repainting', TRUE) RETURNING id INTO facade_section;
    INSERT INTO document_lines (company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, is_active)
    VALUES (2, doc_id, facade_section, 'MATERIAL', 1, 'Facade paint', 120, 'm²', 18, 0, TRUE),
           (2, doc_id, facade_section, 'SERVICE', 2, 'Painter', 40, 'Hour', 45, 0, TRUE);
END $$;
