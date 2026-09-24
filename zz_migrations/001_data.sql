INSERT INTO companies
(name, email, phone, iban, street, postal_code, city, country, logo)
VALUES
('DE DONNO STYLE Sàrl', 'dedonnostyle@gmail.com', '+41799549936', 'CH8500790016247615012', 'Rue de boujean 37', '2502', 'Biel/Bienne', 'Suisse', NULL);

-- ==========================================
-- USERS
-- ==========================================

-- One user per role, all with the same dev password - bcrypt salts each
-- hash differently even for an identical plaintext, so this doesn't
-- collide with password_hash's UNIQUE constraint. The PLATFORM_ADMIN one is
-- inserted by hand here rather than via psql - see the "Roles" bullet in
-- CLAUDE.md for why there's no self-service way to create one otherwise.
INSERT INTO users
(company_id, role, last_name, first_name, email, password_hash)
VALUES
(1, 'ADMIN', 'Griggio', 'Omar', 'admin@dedonnostyle.ch', '$2b$10$iajz9XismG1lmi4UqoUE/eWKmkUbcCP0atCdq69lLJeyzLUYgxzEK'),
(1, 'USER', 'Dupont', 'Jean', 'user@dedonnostyle.ch', '$2b$10$UD0BeQiB2zuK18XQ/xarOem0Gb.cm9rrrhy0EUkBaIFU4NmK4SIa.'),
(1, 'PLATFORM_ADMIN', 'Martin', 'Alex', 'platform-admin@docky.ch', '$2b$10$5t99pOfvURFib9Z/YGDVleN//lXQGF/YR7o3t4decR/WXYvFukl92');

-- ==========================================
-- CLIENTS
-- ==========================================

INSERT INTO clients
(company_id, client_number, type, company_name, vat_number, last_name, first_name, title, email, phone, note)
VALUES
(1, 'C0001', 'INDIVIDUAL', NULL, NULL, 'Dupont', 'Jean', 'Monsieur', 'jean.dupont@gmail.com', '0791112233', NULL),
(1, 'C0002', 'INDIVIDUAL', NULL, NULL, 'Martin', 'Sophie', 'Madame', 'sophie.martin@gmail.com', '0792223344', NULL),
(1, 'C0003', 'PROFESSIONAL', 'Entreprise Martin SA', 'CHE-123.456.789', NULL, NULL, 'Madame, Monsieur,', 'contact@martinsa.ch', '0211112233', 'Client professionnel'),
(1, 'C0004', 'PROFESSIONAL', 'ABC Construction SA', 'CHE-987.654.321', NULL, NULL, 'Madame, Monsieur', 'info@abcconstruction.ch', '0215556677', NULL),
(1, 'C0005', 'INDIVIDUAL', NULL, NULL, 'Durand', 'Paul', 'Monsieur', 'paul.durand@gmail.com', '0783334455', NULL);

-- ==========================================
-- ADDRESSES
-- ==========================================

-- One per client here, so each is its client's only (and therefore primary) address.
INSERT INTO addresses
(company_id, client_id, is_primary, street, postal_code, city, country)
VALUES
(1, 1, TRUE, 'Rue de Lausanne 12', '1000', 'Lausanne', 'Suisse'),
(1, 2, TRUE, 'Route de Genève 5', '1007', 'Lausanne', 'Suisse'),
(1, 3, TRUE, 'Rue Centrale 18', '1020', 'Renens', 'Suisse'),
(1, 4, TRUE, 'Chemin du Bois 45', '1008', 'Prilly', 'Suisse'),
(1, 5, TRUE, 'Avenue des Alpes 9', '1800', 'Vevey', 'Suisse');

-- ==========================================
-- RESOURCES
-- ==========================================

-- MAT101/102/103 also exist on company 2's own catalog further down (same
-- items) - fine now that code is UNIQUE per (company_id, code), not
-- table-wide.
INSERT INTO resources
(company_id, parent_resource_id, type, code, name, unit, selling_price, purchase_price)
VALUES
(1, NULL, 'MATERIAL', 'MAT101', 'Tuile terre cuite', 'Pièce', 3.20, 1.80),
(1, NULL, 'MATERIAL', 'MAT102', 'Isolant laine de roche 100mm', 'm²', 18.50, 12.00),
(1, NULL, 'MATERIAL', 'MAT103', 'Fenêtre PVC triple vitrage', 'Pièce', 650.00, 420.00),

(1, NULL, 'MATERIAL', 'MAT001', 'Sac ciment 25kg', 'Sac', 15.00, 8.50),
(1, NULL, 'MATERIAL', 'MAT002', 'Parpaing 20 cm', 'Pièce', 4.50, 2.80),
(1, NULL, 'MATERIAL', 'MAT003', 'Tube PVC Ø100', 'm', 22.00, 15.00),
(1, NULL, 'MATERIAL', 'MAT004', 'Peinture blanche 10L', 'Pot', 95.00, 70.00),

(1, NULL, 'SERVICE', 'APPR-1', 'Apprenti 1ère', 'Heure', 40.00, NULL),
(1, NULL, 'SERVICE', 'APPR-2', 'Apprenti 2ème', 'Heure', 40.00, NULL),
(1, NULL, 'SERVICE', 'APPR-3', 'Apprenti 3ème', 'Heure', 50.00, NULL),
(1, NULL, 'SERVICE', 'APPR-4', 'Apprenti 4ème', 'Heure', 60.00, NULL),

(1, NULL, 'SERVICE', 'MEN-A', 'Menusier A', 'Heure', 140.00, NULL),
(1, NULL, 'SERVICE', 'MEN-B', 'Menusier B', 'Heure', 110.00, NULL),
(1, NULL, 'SERVICE', 'MEN-C', 'Menusier C', 'Heure', 90.00, NULL),

(1, NULL, 'SERVICE', 'DEP-1', 'Déplacement', 'Heure', 20.00, NULL);

-- ==========================================
-- DOCUMENTS
-- ==========================================

-- amount_excl_vat/amount_incl_vat below match what the app itself would compute
-- from the lines further down (sum of each line's own total, then the document's
-- own discount% applied on top — see recomputeDocumentTotalsServ). amount_incl_vat
-- equals amount_excl_vat since no VAT rate is used in this seed. Kept in sync by
-- hand here since this file bypasses the API — if you change a line below, update
-- the matching document's amounts too. address_id/reference_client/vat_rate are
-- left at their defaults (NULL/NULL/0) throughout.
--
-- Ids 1-2 are the two quotes; 3-6 are the PROJECT document each accepted quote (or
-- manual chantier) is backed by (see document.service.ts's acceptQuoteServ and
-- project.service.ts's addProjectServ); 7-8 are the two invoices, each pointing at
-- the PROJECT document it bills via parent_document_id. A PROJECT document's own
-- parent_document_id is the quote it came from, or NULL for a manually-created
-- chantier (projects 3/4 below).
INSERT INTO documents
(company_id, client_id, parent_document_id, type, number, date, amount_excl_vat, amount_incl_vat, discount, status, introduction, conclusion)
VALUES
(1, 1, NULL, 'QUOTE', 'OFF-2026-0001', '2026-07-10', 775.00, 775.00, 0, 'ACCEPTED', NULL, NULL),
(1, 3, NULL, 'QUOTE', 'OFF-2026-0002', '2026-07-11', 2607.75, 2607.75, 5, 'ACCEPTED', NULL, NULL),

(1, 1, 1, 'PROJECT', 'CH-2026-0001', '2026-07-12', 1070.00, 1070.00, 0, NULL, NULL, NULL),
(1, 3, 2, 'PROJECT', 'CH-2026-0002', '2026-07-13', 1980.00, 1980.00, 0, NULL, NULL, NULL),
(1, 2, NULL, 'PROJECT', 'CH-2026-0003', '2026-08-01', 0, 0, 0, NULL, NULL, NULL),
(1, 2, NULL, 'PROJECT', 'CH-2026-0004', '2026-08-02', 0, 0, 0, NULL, NULL, NULL),

(1, 3, 4, 'INVOICE', 'FAC-2026-0001', '2026-07-15', 1881.00, 1881.00, 5, 'PAID',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.'),
(1, 1, 3, 'INVOICE', 'FAC-2026-0002', '2026-08-05', 865.00, 865.00, 0, 'SENT',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.');

-- ==========================================
-- DOCUMENT SECTIONS
-- ==========================================

-- One section per document above, except documents 2/3 (the second quote
-- and its own PROJECT) which get two ("Pos 1"/"Pos 2"), to have at least
-- one multi-section document in the seed data. document_lines references
-- these by id further down - ids run 1-10 here (not 1-8), in insertion
-- order: 1 (doc 1), 2-3 (doc 2), 4-5 (doc 3), 6 (doc 4), 7 (doc 5),
-- 8 (doc 6), 9 (doc 7), 10 (doc 8).
-- date_start/date_end carry a time (TIMESTAMP, not DATE) - each work window
-- below uses a plain 08:00-17:00 workday. Sections 7/8 (docs 5/6, the two
-- IN_PROGRESS - not yet COMPLETED - chantiers with no quote behind them)
-- are left with no schedule (NULL): a still-open chantier's own dates
-- aren't known yet here, only closed ones and the quotes/invoices around
-- them carry a fixed work window. getProjectsFromDB sorts those without one
-- after those with (see CLAUDE.md's Backend section).
INSERT INTO document_sections
(company_id, document_id, position, title, description, date_start, date_end)
VALUES
(1, 1, 1, 'Pos 1', NULL, '2026-07-14 08:00:00', '2026-07-14 17:00:00'),
(1, 2, 1, 'Pos 1', NULL, '2026-07-21 08:00:00', '2026-07-21 17:00:00'),
(1, 2, 2, 'Pos 2', 'Finitions et raccordement électrique', '2026-07-26 08:00:00', '2026-07-26 17:00:00'),
(1, 3, 1, 'Pos 1', NULL, '2026-07-14 08:00:00', '2026-07-14 16:30:00'),
(1, 3, 2, 'Pos 2', 'Peinture et finitions', '2026-07-15 08:00:00', '2026-07-15 15:00:00'),
(1, 4, 1, 'Pos 1', NULL, '2026-07-21 08:00:00', '2026-07-21 17:00:00'),
(1, 5, 1, 'Pos 1', NULL, NULL, NULL),
(1, 6, 1, 'Pos 1', NULL, NULL, NULL),
(1, 7, 1, 'Pos 1', NULL, '2026-07-26 08:00:00', '2026-07-26 17:00:00'),
(1, 8, 1, 'Pos 1', NULL, '2026-07-15 08:00:00', '2026-07-15 16:00:00');

-- ==========================================
-- DOCUMENT LINES
-- ==========================================

-- resource_id matches resources' insertion order above (4 Sac ciment,
-- 5 Parpaing, 6 Tube PVC, 7 Peinture, 15 Déplacement). Several lines below
-- were originally catalog-backed by resources that no longer exist in the
-- current list (Maçon qualifié, the old generic Apprenti, Electricien
-- externe, Location nacelle) - resource_id is NULL on those now rather than
-- pointed at some unrelated new item; the line's own label/quantity/price
-- (what actually prints) is untouched either way.
INSERT INTO document_lines
(company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, resource_id)
VALUES

-- Quote 1 (775.00) - section 1
(1, 1, 1, 'MATERIAL', 1, 'Sac ciment 25kg', 20, 'Sac', 15, 0, 4),
(1, 1, 1, 'SERVICE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0, NULL),

-- Quote 2 - section 2 ("Pos 1": 1980, unchanged below).
(1, 2, 2, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0, 5),
(1, 2, 2, 'SERVICE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0, NULL),
(1, 2, 2, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 15),

-- Quote 2 - section 3 ("Pos 2": 765). Combined subtotal 1980 + 765 = 2745,
-- - 5% = 2607.75 (this document's own stored amount).
(1, 2, 3, 'MATERIAL', 1, 'Peinture blanche 10L', 3, 'Pot', 95, 0, 7),
(1, 2, 3, 'SERVICE', 2, 'Electricien externe', 4, 'Heure', 120, 0, NULL),

-- PROJECT CH-2026-0001 - section 4 ("Pos 1": 865). Real quantities used on
-- site, adjusted by hand from quote 1's own (20 sacs -> 22, déplacement
-- added).
(1, 3, 4, 'MATERIAL', 1, 'Sac ciment 25kg', 22, 'Sac', 15, 0, 4),
(1, 3, 4, 'SERVICE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0, NULL),
(1, 3, 4, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 15),

-- PROJECT CH-2026-0001 - section 5 ("Pos 2": 205, a later addition not in
-- the original quote). Combined subtotal 865 + 205 = 1070 (this document's
-- own stored amount, no discount).
(1, 3, 5, 'MATERIAL', 1, 'Peinture blanche 10L', 1, 'Pot', 95, 0, 7),
(1, 3, 5, 'SERVICE', 2, 'Apprenti', 2, 'Heure', 55, 0, NULL),

-- PROJECT CH-2026-0002 (1980.00) - section 6. Matches quote 2's own "Pos 1"
-- exactly (not its "Pos 2" - that extra finishing work was quoted but never
-- actually part of this chantier), no adjustment needed, already invoiced
-- below.
(1, 4, 6, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0, 5),
(1, 4, 6, 'SERVICE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0, NULL),
(1, 4, 6, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 15),

-- PROJECT CH-2026-0003 (0.00) - section 7. Still IN_PROGRESS, no quote
-- behind it - linked by hand, nothing used on site yet.
(1, 5, 7, 'MATERIAL', 1, 'Tube PVC Ø100', 0, 'm', 22.00, 0, 6),
(1, 5, 7, 'SERVICE', 2, 'Maçon qualifié', 0, 'Heure', 95, 0, NULL),

-- PROJECT CH-2026-0004 (0.00) - section 8. Same idea (apprenti, nacelle).
(1, 6, 8, 'SERVICE', 1, 'Apprenti', 0, 'Heure', 55, 0, NULL),
(1, 6, 8, 'SERVICE', 2, 'Location nacelle', 0, 'Jour', 250, 0, NULL),

-- Invoice FAC-2026-0001 (1881.00), bills PROJECT CH-2026-0002 - section 9,
-- same lines as that project.
(1, 7, 9, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0, 5),
(1, 7, 9, 'SERVICE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0, NULL),
(1, 7, 9, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 15),

-- Invoice FAC-2026-0002 (865.00), bills PROJECT CH-2026-0001 - section 10,
-- same lines as that project's own "Pos 1" (not its "Pos 2" - the finishing
-- work billed separately later, not part of this invoice).
(1, 8, 10, 'MATERIAL', 1, 'Sac ciment 25kg', 22, 'Sac', 15, 0, 4),
(1, 8, 10, 'SERVICE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0, NULL),
(1, 8, 10, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 15);

-- ==========================================
-- DOCUMENT TEMPLATES
-- ==========================================

-- Only INVOICE seeded for now - QUOTE has none yet (both editable from the
-- Profile page, see profile.ts).
INSERT INTO document_templates
(company_id, type, introduction, conclusion)
VALUES
(1, 'INVOICE',
	'Madame, Monsieur,

	C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.',
	'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

                                                                                                          Nom de l''entreprise');

-- ==========================================
-- PROJECTS
-- ==========================================

INSERT INTO project_types (label)
VALUES
('Porte'),
('Cuisines'),
('Salle de bain'),
('Réparation'),
('Isolation'),
('Autre');

-- document_id points at each project's own PROJECT document above (ids
-- 3-6) - that document's own sections/lines (see DOCUMENT LINES above) are
-- this project's resource ledger. Projects 1/2 are COMPLETED (their quote
-- was accepted, see acceptQuoteServ); 3/4 are still IN_PROGRESS, created by
-- hand (project-form.ts), no quote behind them.
INSERT INTO projects (company_id, document_id, client_id, project_type_id, name, status)
VALUES
(1, 3, 1, 1, 'Réparation de porte de cave', 'COMPLETED'),
(1, 4, 3, 2, 'Création de cuisine sur mesure', 'COMPLETED'),
(1, 5, 2, 3, 'Réparation de meuble de salle de bain', 'IN_PROGRESS'),
(1, 6, 2, 4, 'Posage de l''isolation', 'IN_PROGRESS');

-- ==========================================================================
-- COMPANY 2 - DEMO (FOR RECRUITERS)
-- ==========================================================================
--
-- A second, fully separate company/tenant, seeded purely so a v1.0 deploy
-- has something self-contained to hand out to a recruiter without touching
-- company 1's own data. Same shape/conventions as company 1 above, just a
-- fictional Valais renovation/roofing business instead - ids below continue
-- straight on from company 1's own (this file always runs once, on an empty
-- volume, so insertion order == id order - see the ORDER BY notes elsewhere
-- in this codebase for why that matters).
--
-- Demo login: admin@demo.docky.ch / Demo2026! (ADMIN, not PLATFORM_ADMIN -
-- see CLAUDE.md's Roles section for why there's no self-service way to make
-- one of those; this account only ever sees company 2's own data).

INSERT INTO companies
(name, email, phone, iban, street, postal_code, city, country, logo)
VALUES
-- CH9300762011623852957 is the official Swiss QR-bill spec's own example
-- IBAN, not a real account - fine here since checkIban only checks
-- length/CH-or-LI prefix, never a real checksum (see
-- pdf/swiss-qr-bill/validators/creditor.validator.ts).
('Rénov Alpes Sàrl', 'contact@renovalpes.ch', '+41798765432', 'CH9300762011623852957', 'Avenue de la Gare 22', '1950', 'Sion', 'Suisse', NULL);

-- ==========================================
-- USERS
-- ==========================================

INSERT INTO users
(company_id, role, last_name, first_name, email, password_hash)
VALUES
(2, 'ADMIN', 'Démo', 'Admin', 'admin@demo.docky.ch', '$2b$10$RsWdYHkci6jeRUfTYl/qt.HcXY0FK0wa5OKNl2sJRIdXejkpyQ9Wy');

-- ==========================================
-- CLIENTS
-- ==========================================

-- client_number is UNIQUE across the whole table, not just per company (see
-- 000_base.sql) - continuing C0006+ rather than restarting at C0001.
INSERT INTO clients
(company_id, client_number, type, company_name, vat_number, last_name, first_name, title, email, phone, note)
VALUES
(2, 'C0006', 'INDIVIDUAL', NULL, NULL, 'Fournier', 'Marc', 'Monsieur', 'marc.fournier@gmail.com', '0764445566', NULL),
(2, 'C0007', 'INDIVIDUAL', NULL, NULL, 'Bianchi', 'Elena', 'Madame', 'elena.bianchi@gmail.com', '0765556677', NULL),
(2, 'C0008', 'PROFESSIONAL', 'Hôtel du Cervin SA', 'CHE-111.222.333', NULL, NULL, 'Madame, Monsieur,', 'contact@hotelducervin.ch', '0276667788', 'Client professionnel'),
(2, 'C0009', 'PROFESSIONAL', 'Immobilière Valaisanne Sàrl', 'CHE-444.555.666', NULL, NULL, 'Madame, Monsieur,', 'info@immo-valais.ch', '0278889900', 'Client professionnel'),
(2, 'C0010', 'INDIVIDUAL', NULL, NULL, 'Roduit', 'Claire', 'Madame', 'claire.roduit@gmail.com', '0767778899', NULL);

-- ==========================================
-- ADDRESSES
-- ==========================================

INSERT INTO addresses
(company_id, client_id, is_primary, street, postal_code, city, country)
VALUES
(2, 6, TRUE, 'Rue du Rhône 14', '1950', 'Sion', 'Suisse'),
(2, 7, TRUE, 'Route de Riddes 8', '1908', 'Riddes', 'Suisse'),
(2, 8, TRUE, 'Rue du Cervin 3', '3920', 'Zermatt', 'Suisse'),
(2, 9, TRUE, 'Avenue de la Gare 40', '1950', 'Sion', 'Suisse'),
(2, 10, TRUE, 'Chemin des Vignes 6', '1963', 'Vétroz', 'Suisse');

-- ==========================================
-- RESOURCES
-- ==========================================

-- code is UNIQUE per (company_id, code), not table-wide (see 000_base.sql)
-- - reusing company 1's own MAT101/102/103 codes here is fine.
INSERT INTO resources
(company_id, parent_resource_id, type, code, name, unit, selling_price, purchase_price)
VALUES
(2, NULL, 'MATERIAL', 'MAT101', 'Tuile terre cuite', 'Pièce', 3.20, 1.80),
(2, NULL, 'MATERIAL', 'MAT102', 'Isolant laine de roche 100mm', 'm²', 18.50, 12.00),
(2, NULL, 'MATERIAL', 'MAT103', 'Fenêtre PVC triple vitrage', 'Pièce', 650.00, 420.00),

(2, NULL, 'SERVICE', 'MO101', 'Couvreur qualifié', 'Heure', 105.00, NULL),
(2, NULL, 'SERVICE', 'MO102', 'Apprenti couvreur', 'Heure', 58.00, NULL),

(2, NULL, 'SERVICE', 'ST101', 'Grutier externe', 'Heure', 140.00, 100.00),

(2, NULL, 'SERVICE', 'DIV101', 'Déplacement', 'Forfait', 65.00, NULL),
(2, NULL, 'SERVICE', 'DIV102', 'Location échafaudage', 'Semaine', 320.00, 220.00);

-- ==========================================
-- DOCUMENTS
-- ==========================================

-- Same bypass-the-API caveat as company 1's own block above: amounts here
-- are hand-computed from the lines further down, kept in sync by hand.
-- Ids 9-11 are three quotes; 12-15 are the PROJECT document each is backed
-- by (12-14 from an accepted quote, 15 a manual chantier with no quote
-- behind it); 16-18 are the three invoices, each billing its own PROJECT
-- document via parent_document_id - two already PAID (for the dashboard's
-- own "paid amount per client" feature to have something to show), one
-- still SENT.
INSERT INTO documents
(company_id, client_id, parent_document_id, type, number, date, amount_excl_vat, amount_incl_vat, discount, status, introduction, conclusion)
VALUES
(2, 8, NULL, 'QUOTE', 'OFF-2026-0001', '2026-06-01', 2540.00, 2540.00, 0, 'ACCEPTED', NULL, NULL),
(2, 9, NULL, 'QUOTE', 'OFF-2026-0002', '2026-06-08', 6635.75, 6635.75, 5, 'ACCEPTED', NULL, NULL),
(2, 10, NULL, 'QUOTE', 'OFF-2026-0003', '2026-06-12', 1597.00, 1597.00, 0, 'ACCEPTED', NULL, NULL),

(2, 8, 9, 'PROJECT', 'CH-2026-0001', '2026-06-15', 2572.00, 2572.00, 0, NULL, NULL, NULL),
(2, 9, 10, 'PROJECT', 'CH-2026-0002', '2026-06-20', 6635.75, 6635.75, 5, NULL, NULL, NULL),
(2, 10, 11, 'PROJECT', 'CH-2026-0003', '2026-06-24', 1597.00, 1597.00, 0, NULL, NULL, NULL),
(2, 6, NULL, 'PROJECT', 'CH-2026-0004', '2026-07-05', 0, 0, 0, NULL, NULL, NULL),

(2, 8, 12, 'INVOICE', 'FAC-2026-0001', '2026-06-25', 2572.00, 2572.00, 0, 'PAID',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.'),
(2, 9, 13, 'INVOICE', 'FAC-2026-0002', '2026-07-02', 6635.75, 6635.75, 5, 'PAID',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.'),
(2, 10, 14, 'INVOICE', 'FAC-2026-0003', '2026-07-10', 1597.00, 1597.00, 0, 'SENT',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.');

-- ==========================================
-- DOCUMENT SECTIONS
-- ==========================================

-- One "Travaux" section per document above (ids 11-20, same order - company
-- 1 now seeds 10 sections of its own, not 8, so company 2's own start two
-- higher than the document ids alone would suggest).
-- date_start/date_end match each section's underlying job: quote (11-13)
-- and invoice (18-20) sections mirror the actual project window they
-- propose/bill, project sections (14-16) are that same window since that's
-- when the work happened. Section 17 (doc 15, company 2's only IN_PROGRESS
-- - not yet COMPLETED - chantier) is left with no schedule (NULL), same as
-- company 1's own open chantiers above.
INSERT INTO document_sections
(company_id, document_id, position, title, date_start, date_end)
VALUES
(2, 9, 1, 'Travaux', '2026-09-15 07:00:00', '2026-09-15 17:00:00'),
(2, 10, 1, 'Travaux', '2026-09-22 07:00:00', '2026-09-22 11:00:00'),
(2, 11, 1, 'Travaux', '2026-09-26 08:00:00', '2026-09-26 17:00:00'),
(2, 12, 1, 'Travaux', '2026-09-14 07:00:00', '2026-09-14 11:00:00'),
(2, 13, 1, 'Travaux', '2026-09-22 07:00:00', '2026-09-22 17:00:00'),
(2, 14, 1, 'Travaux', '2026-09-26 08:00:00', '2026-09-26 17:00:00'),
(2, 15, 1, 'Travaux', NULL, NULL),
(2, 16, 1, 'Travaux', '2026-09-15 07:00:00', '2026-09-15 17:00:00'),
(2, 17, 1, 'Travaux', '2026-09-22 07:00:00', '2026-09-22 11:00:00'),
(2, 18, 1, 'Travaux', '2026-09-27 08:00:00', '2026-09-27 17:00:00');

-- ==========================================
-- DOCUMENT LINES
-- ==========================================

-- resource_id matches resources' insertion order above (16 Tuile terre
-- cuite, 17 Isolant laine de roche, 18 Fenêtre PVC, 19 Couvreur qualifié,
-- 20 Apprenti couvreur, 22 Déplacement, 23 Location échafaudage). Grutier
-- externe (21) is left unused, same idea as company 1's own unused
-- Electricien externe/Peinture.
INSERT INTO document_lines
(company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, resource_id)
VALUES

-- Quote 1 (2540.00) - section 11
(2, 9, 11, 'MATERIAL', 1, 'Tuile terre cuite', 200, 'Pièce', 3.20, 0, 16),
(2, 9, 11, 'SERVICE', 2, 'Couvreur qualifié', 12, 'Heure', 105, 0, 19),
(2, 9, 11, 'SERVICE', 3, 'Location échafaudage', 2, 'Semaine', 320, 0, 23),

-- Quote 2 (6985 - 5% = 6635.75) - section 12
(2, 10, 12, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 120, 'm²', 18.50, 0, 17),
(2, 10, 12, 'MATERIAL', 2, 'Fenêtre PVC triple vitrage', 4, 'Pièce', 650, 0, 18),
(2, 10, 12, 'SERVICE', 3, 'Couvreur qualifié', 20, 'Heure', 105, 0, 19),
(2, 10, 12, 'SERVICE', 4, 'Déplacement', 1, 'Forfait', 65, 0, 22),

-- Quote 3 (1597.00) - section 13
(2, 11, 13, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 2, 'Pièce', 650, 0, 18),
(2, 11, 13, 'SERVICE', 2, 'Apprenti couvreur', 4, 'Heure', 58, 0, 20),
(2, 11, 13, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 22),

-- PROJECT CH-2026-0001 (2572.00) - section 14. Real quantities used on
-- site, adjusted by hand from quote 1's own (200 tuiles -> 210).
(2, 12, 14, 'MATERIAL', 1, 'Tuile terre cuite', 210, 'Pièce', 3.20, 0, 16),
(2, 12, 14, 'SERVICE', 2, 'Couvreur qualifié', 12, 'Heure', 105, 0, 19),
(2, 12, 14, 'SERVICE', 3, 'Location échafaudage', 2, 'Semaine', 320, 0, 23),

-- PROJECT CH-2026-0002 (6635.75) - section 15. Matches quote 2's lines
-- exactly - already invoiced below.
(2, 13, 15, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 120, 'm²', 18.50, 0, 17),
(2, 13, 15, 'MATERIAL', 2, 'Fenêtre PVC triple vitrage', 4, 'Pièce', 650, 0, 18),
(2, 13, 15, 'SERVICE', 3, 'Couvreur qualifié', 20, 'Heure', 105, 0, 19),
(2, 13, 15, 'SERVICE', 4, 'Déplacement', 1, 'Forfait', 65, 0, 22),

-- PROJECT CH-2026-0003 (1597.00) - section 16. Matches quote 3's lines
-- exactly - already invoiced below (still SENT, not yet paid).
(2, 14, 16, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 2, 'Pièce', 650, 0, 18),
(2, 14, 16, 'SERVICE', 2, 'Apprenti couvreur', 4, 'Heure', 58, 0, 20),
(2, 14, 16, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 22),

-- PROJECT CH-2026-0004 (0.00) - section 17. Still IN_PROGRESS, no quote
-- behind it - linked by hand, nothing used on site yet.
(2, 15, 17, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 0, 'm²', 18.50, 0, 17),
(2, 15, 17, 'SERVICE', 2, 'Couvreur qualifié', 0, 'Heure', 105, 0, 19),

-- Invoice FAC-2026-0001 (2572.00), bills PROJECT CH-2026-0001 - section 18,
-- same lines as that project.
(2, 16, 18, 'MATERIAL', 1, 'Tuile terre cuite', 210, 'Pièce', 3.20, 0, 16),
(2, 16, 18, 'SERVICE', 2, 'Couvreur qualifié', 12, 'Heure', 105, 0, 19),
(2, 16, 18, 'SERVICE', 3, 'Location échafaudage', 2, 'Semaine', 320, 0, 23),

-- Invoice FAC-2026-0002 (6635.75), bills PROJECT CH-2026-0002 - section 19,
-- same lines as that project.
(2, 17, 19, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 120, 'm²', 18.50, 0, 17),
(2, 17, 19, 'MATERIAL', 2, 'Fenêtre PVC triple vitrage', 4, 'Pièce', 650, 0, 18),
(2, 17, 19, 'SERVICE', 3, 'Couvreur qualifié', 20, 'Heure', 105, 0, 19),
(2, 17, 19, 'SERVICE', 4, 'Déplacement', 1, 'Forfait', 65, 0, 22),

-- Invoice FAC-2026-0003 (1597.00), bills PROJECT CH-2026-0003 - section 20,
-- same lines as that project.
(2, 18, 20, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 2, 'Pièce', 650, 0, 18),
(2, 18, 20, 'SERVICE', 2, 'Apprenti couvreur', 4, 'Heure', 58, 0, 20),
(2, 18, 20, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 22);

-- ==========================================
-- DOCUMENT TEMPLATES
-- ==========================================

INSERT INTO document_templates
(company_id, type, introduction, conclusion)
VALUES
(2, 'INVOICE',
	'Madame, Monsieur,

	C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.',
	'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

                                                                                                          Rénov Alpes Sàrl');

-- ==========================================
-- PROJECTS
-- ==========================================

-- document_id points at each project's own PROJECT document above (ids
-- 12-15). Projects 1-3 (here) are COMPLETED (their quote was accepted);
-- the 4th is still IN_PROGRESS, created by hand, no quote behind it -
-- project_type_id reuses company 1's own global project_types (1 Porte,
-- 2 Cuisines, 3 Salle de bain, 4 Réparation, 5 Isolation, 6 Autre) - that
-- table has no company_id, it's shared across every tenant.
INSERT INTO projects (company_id, document_id, client_id, project_type_id, name, status)
VALUES
(2, 12, 8, 4, 'Rénovation toiture hôtel', 'COMPLETED'),
(2, 13, 9, 5, 'Isolation et fenêtres immeuble', 'COMPLETED'),
(2, 14, 10, 6, 'Remplacement fenêtres', 'COMPLETED'),
(2, 15, 6, 5, 'Isolation combles', 'IN_PROGRESS');

-- ==========================================================================
-- COMPANY 1 - ADDITIONAL TEST DATA
-- ==========================================================================
--
-- More company 1 rows, purely to exercise cases the data above doesn't:
-- an archived client/resource/project, a client with a second (non-primary)
-- address, every DocumentStatus value not used yet (DRAFT/SENT/REJECTED/
-- CANCELLED - only ACCEPTED/PAID/SENT existed before), a document with
-- reference_client set, a document billed to a specific non-primary address,
-- a QUOTE document_template, and a project with no project_type_id.
--
-- Deliberately appended here (after company 2's own block) instead of
-- alongside company 1's other INSERTs above - every id below continues
-- straight on from the current end of the file (clients 10, addresses 10,
-- resources 23, documents 18, document_sections 20, document_templates 2,
-- projects 8), so adding it here instead means none of company 2's own
-- hardcoded id references above have to be renumbered.

-- ==========================================
-- CLIENTS
-- ==========================================

-- C0011+ (not C0006+) - company 2 already claimed those (client_number is
-- UNIQUE table-wide, not per company - see 000_base.sql).
INSERT INTO clients
(company_id, client_number, type, company_name, vat_number, last_name, first_name, title, email, phone, note, is_active)
VALUES
(1, 'C0011', 'PROFESSIONAL', 'Toiture Plus Sàrl', 'CHE-222.333.444', NULL, NULL, 'Madame, Monsieur,', 'contact@toitureplus.ch', '0219998877', NULL, FALSE),
(1, 'C0012', 'INDIVIDUAL', NULL, NULL, 'Bertrand', 'Lucie', 'Madame', 'lucie.bertrand@gmail.com', '0761234567', NULL, TRUE),
(1, 'C0013', 'INDIVIDUAL', NULL, NULL, 'Moser', 'Thomas', 'Monsieur', 'thomas.moser@gmail.com', '0789876543', NULL, TRUE);

-- ==========================================
-- ADDRESSES
-- ==========================================

-- First row is a second, non-primary address for client 3 (Entreprise
-- Martin SA) - its own site address, different from its HQ (address 3
-- above) - document 24 further down bills that one specifically via its
-- own address_id, to test picking a non-default address. The rest are the
-- one-per-client pattern used everywhere else in this file.
INSERT INTO addresses
(company_id, client_id, is_primary, street, postal_code, city, country)
VALUES
(1, 3, FALSE, 'Route Industrielle 8', '1020', 'Renens', 'Suisse'),
(1, 11, TRUE, 'Rue de la Gare 3', '1003', 'Lausanne', 'Suisse'),
(1, 12, TRUE, 'Chemin des Fleurs 7', '1010', 'Lausanne', 'Suisse'),
(1, 13, TRUE, 'Avenue de la Praille 22', '1227', 'Carouge', 'Suisse');

-- ==========================================
-- RESOURCES
-- ==========================================

INSERT INTO resources
(company_id, parent_resource_id, type, code, name, unit, selling_price, purchase_price, is_active)
VALUES
(1, NULL, 'SERVICE', 'MO003', 'Chef de chantier', 'Heure', 110.00, NULL, TRUE),
-- Archived - to test the resource list's own archive filter.
(1, NULL, 'MATERIAL', 'MAT005', 'Brique réfractaire', 'Pièce', 6.50, 4.00, FALSE);

-- ==========================================
-- DOCUMENT TEMPLATES
-- ==========================================

-- Company 1 only had an INVOICE template - this adds its QUOTE one too.
INSERT INTO document_templates
(company_id, type, introduction, conclusion)
VALUES
(1, 'QUOTE',
	'Madame, Monsieur,

	Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.',
	'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

	Avec nos meilleures salutations.');

-- ==========================================
-- DOCUMENTS
-- ==========================================

-- Same bypass-the-API caveat as the blocks above: amounts are hand-computed
-- from the lines further down. Ids 19-24 (client_id/status/notes below):
--   19 QUOTE  client 12  DRAFT      - still being put together, no lines yet.
--   20 QUOTE  client 13  SENT       - sent, awaiting an answer.
--   21 QUOTE  client 13  REJECTED   - declined, and archived (is_active).
--   22 INVOICE client 3  CANCELLED  - standalone, no parent_document_id.
--   23 INVOICE client 4  DRAFT      - reference_client set (client's own PO
--                                     number); client 4 (ABC Construction SA)
--                                     otherwise has no documents anywhere else.
--   24 INVOICE client 3  PAID       - address_id set to client 3's second,
--                                     non-primary address (see ADDRESSES).
-- 25 is a PROJECT document (a manually-created chantier, no quote behind
-- it) - see PROJECTS further down.
INSERT INTO documents
(company_id, client_id, address_id, reference_client, parent_document_id, type, number, date, amount_excl_vat, amount_incl_vat, discount, status, introduction, conclusion, is_active)
VALUES
(1, 12, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0003', '2026-08-10', 0, 0, 0, 'DRAFT', NULL, NULL, TRUE),
(1, 13, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0004', '2026-08-11', 980.00, 980.00, 0, 'SENT', NULL, NULL, TRUE),
(1, 13, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0005', '2026-08-12', 355.00, 355.00, 0, 'REJECTED', NULL, NULL, FALSE),
(1, 3, NULL, NULL, NULL, 'INVOICE', 'FAC-2026-0003', '2026-08-15', 75.00, 75.00, 0, 'CANCELLED',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.', TRUE),
(1, 4, NULL, 'BC-2026-445', NULL, 'INVOICE', 'FAC-2026-0004', '2026-08-18', 780.00, 780.00, 0, 'DRAFT',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.', TRUE),
(1, 3, 11, NULL, NULL, 'INVOICE', 'FAC-2026-0005', '2026-08-20', 1625.00, 1462.50, 10, 'PAID',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.', TRUE),
(1, 12, NULL, NULL, NULL, 'PROJECT', 'CH-2026-0005', '2026-08-22', 680.00, 680.00, 0, NULL, NULL, NULL, FALSE);

-- ==========================================
-- DOCUMENT SECTIONS
-- ==========================================

-- One "Travaux" section per document above that has lines (not document 19,
-- the still-empty DRAFT quote) - ids 21-26, same order as documents 20-25.
-- Section 26 (doc 25, the suspended chantier - IN_PROGRESS, not COMPLETED,
-- see its own "à reprendre" note) is left with no schedule (NULL), same as
-- every other still-open chantier above.
INSERT INTO document_sections
(company_id, document_id, position, title, date_start, date_end)
VALUES
(1, 20, 1, 'Travaux', '2026-09-19 08:00:00', '2026-09-19 17:00:00'),
(1, 21, 1, 'Travaux', '2026-09-20 08:00:00', '2026-09-20 15:00:00'),
(1, 22, 1, 'Travaux', '2026-09-14 08:00:00', '2026-09-14 12:00:00'),
(1, 23, 1, 'Travaux', '2026-09-25 08:00:00', '2026-09-25 14:00:00'),
(1, 24, 1, 'Travaux', '2026-09-18 08:00:00', '2026-09-18 17:00:00'),
(1, 25, 1, 'Travaux', NULL, NULL);

-- ==========================================
-- DOCUMENT LINES
-- ==========================================

-- resource_id matches resources' insertion order across the whole file (4
-- Sac ciment, 5 Parpaing, 6 Tube PVC, 7 Peinture, 15 Déplacement, 24 Chef de
-- chantier, 25 Brique réfractaire - the last two added just above). Same
-- deal as company 1's original lines above: Maçon qualifié/Apprenti/
-- Electricien externe no longer exist in the resource list, so resource_id
-- is NULL on those now rather than pointed at an unrelated new item.
INSERT INTO document_lines
(company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, resource_id)
VALUES

-- Quote OFF-2026-0004 (980.00) - section 21
(1, 20, 21, 'MATERIAL', 1, 'Tube PVC Ø100', 10, 'm', 22.00, 0, 6),
(1, 20, 21, 'SERVICE', 2, 'Maçon qualifié', 8, 'Heure', 95, 0, NULL),

-- Quote OFF-2026-0005 (355.00), rejected - section 22
(1, 21, 22, 'MATERIAL', 1, 'Peinture blanche 10L', 2, 'Pot', 95, 0, 7),
(1, 21, 22, 'SERVICE', 2, 'Apprenti', 3, 'Heure', 55, 0, NULL),

-- Invoice FAC-2026-0003 (75.00), cancelled - section 23
(1, 22, 23, 'MATERIAL', 1, 'Sac ciment 25kg', 5, 'Sac', 15, 0, 4),

-- Invoice FAC-2026-0004 (780.00), still DRAFT - section 24
(1, 23, 24, 'SERVICE', 1, 'Electricien externe', 6, 'Heure', 120, 0, NULL),
(1, 23, 24, 'SERVICE', 2, 'Déplacement', 1, 'Forfait', 60, 0, 15),

-- Invoice FAC-2026-0005 (1625 - 10% = 1462.50) - section 25
(1, 24, 25, 'MATERIAL', 1, 'Parpaing 20 cm', 150, 'Pièce', 4.50, 0, 5),
(1, 24, 25, 'SERVICE', 2, 'Maçon qualifié', 10, 'Heure', 95, 0, NULL),

-- PROJECT CH-2026-0005 (680.00), archived, no project_type_id - section 26
(1, 25, 26, 'SERVICE', 1, 'Chef de chantier', 5, 'Heure', 110, 0, 24),
(1, 25, 26, 'MATERIAL', 2, 'Brique réfractaire', 20, 'Pièce', 6.50, 0, 25);

-- ==========================================
-- PROJECTS
-- ==========================================

-- Backed by document 25 above - archived (is_active) and with no
-- project_type_id (an "unclassified" chantier), both otherwise untested
-- edge cases in the data above.
INSERT INTO projects
(company_id, document_id, client_id, project_type_id, name, note, status, is_active)
VALUES
(1, 25, 12, NULL, 'Rénovation façade', 'Chantier suspendu - à reprendre', 'IN_PROGRESS', FALSE);

-- ==========================================
-- MORE PAID INVOICES (for the dashboard's own "paid amount per client")
-- ==========================================

-- Every PAID invoice above (FAC-2026-0001/0005) bills client 3 - the
-- dashboard's own "paid amount per client" table (GET /dashboard/paid-by-client)
-- had only one row to show for company 1 because of that. These two add a
-- second and third client to it.
INSERT INTO documents
(company_id, client_id, parent_document_id, type, number, date, amount_excl_vat, amount_incl_vat, discount, status, introduction, conclusion)
VALUES
(1, 1, NULL, 'INVOICE', 'FAC-2026-0006', '2026-08-25', 530.00, 530.00, 0, 'PAID',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.'),
(1, 5, NULL, 'INVOICE', 'FAC-2026-0007', '2026-08-28', 635.00, 635.00, 0, 'PAID',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.');

-- Due dates for every invoice (payment due, 30 days after its date - the two
-- SENT ones, company 1's FAC-2026-0002 and company 2's FAC-2026-0003, are
-- already past it, so the dashboard's "open invoices" tile has something
-- overdue to show) and for some quotes ("valable jusqu'au", 30 days). Kept as one block, by
-- (company_id, number), rather than a column in each INSERT above - those
-- span 4 statements with different column lists. documents.due_date is
-- plain data, set directly (no computation server-side).
UPDATE documents AS d
SET due_date = v.due_date::date
FROM (VALUES
(1, 'OFF-2026-0001', '2026-08-09'),
(1, 'OFF-2026-0002', '2026-08-10'),
(1, 'OFF-2026-0004', '2026-09-10'),
(1, 'FAC-2026-0001', '2026-08-14'),
(1, 'FAC-2026-0002', '2026-09-04'),
(1, 'FAC-2026-0003', '2026-09-14'),
(1, 'FAC-2026-0004', '2026-09-17'),
(1, 'FAC-2026-0005', '2026-09-19'),
(1, 'FAC-2026-0006', '2026-09-24'),
(1, 'FAC-2026-0007', '2026-09-27'),
(2, 'OFF-2026-0001', '2026-07-01'),
(2, 'OFF-2026-0003', '2026-07-12'),
(2, 'FAC-2026-0001', '2026-07-25'),
(2, 'FAC-2026-0002', '2026-08-01'),
(2, 'FAC-2026-0003', '2026-08-09')
) AS v(company_id, number, due_date)
WHERE d.company_id = v.company_id AND d.number = v.number;

INSERT INTO document_sections
(company_id, document_id, position, title, date_start, date_end)
VALUES
(1, 26, 1, 'Travaux', '2026-08-20 08:00:00', '2026-08-21 17:00:00'),
(1, 27, 1, 'Travaux', '2026-08-24 08:00:00', '2026-08-24 16:00:00');

INSERT INTO document_lines
(company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, resource_id)
VALUES

-- Invoice FAC-2026-0006 (530.00), client 1 - section 27
(1, 26, 27, 'MATERIAL', 1, 'Sac ciment 25kg', 10, 'Sac', 15, 0, 4),
(1, 26, 27, 'SERVICE', 2, 'Maçon qualifié', 4, 'Heure', 95, 0, NULL),

-- Invoice FAC-2026-0007 (635.00), client 5 - section 28
(1, 27, 28, 'MATERIAL', 1, 'Parpaing 20 cm', 80, 'Pièce', 4.50, 0, 5),
(1, 27, 28, 'SERVICE', 2, 'Apprenti', 5, 'Heure', 55, 0, NULL);
