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

INSERT INTO resources
(company_id, parent_resource_id, type, code, name, unit, selling_price, purchase_price)
VALUES
(1, NULL, 'MATERIAL', 'MAT001', 'Sac ciment 25kg', 'Sac', 15.00, 8.50),
(1, NULL, 'MATERIAL', 'MAT002', 'Parpaing 20 cm', 'Pièce', 4.50, 2.80),
(1, NULL, 'MATERIAL', 'MAT003', 'Tube PVC Ø100', 'm', 22.00, 15.00),
(1, NULL, 'MATERIAL', 'MAT004', 'Peinture blanche 10L', 'Pot', 95.00, 70.00),

(1, NULL, 'SERVICE', 'MO001', 'Maçon qualifié', 'Heure', 95.00, NULL),
(1, NULL, 'SERVICE', 'MO002', 'Apprenti', 'Heure', 55.00, NULL),

(1, NULL, 'SERVICE', 'ST001', 'Electricien externe', 'Heure', 120.00, 90.00),

(1, NULL, 'SERVICE', 'DIV001', 'Déplacement', 'Forfait', 60.00, NULL),
(1, NULL, 'SERVICE', 'DIV002', 'Location nacelle', 'Jour', 250.00, 180.00);

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
INSERT INTO document_sections
(company_id, document_id, position, title, description)
VALUES
(1, 1, 1, 'Pos 1', NULL),
(1, 2, 1, 'Pos 1', NULL),
(1, 2, 2, 'Pos 2', 'Finitions et raccordement électrique'),
(1, 3, 1, 'Pos 1', NULL),
(1, 3, 2, 'Pos 2', 'Peinture et finitions'),
(1, 4, 1, 'Pos 1', NULL),
(1, 5, 1, 'Pos 1', NULL),
(1, 6, 1, 'Pos 1', NULL),
(1, 7, 1, 'Pos 1', NULL),
(1, 8, 1, 'Pos 1', NULL);

-- ==========================================
-- DOCUMENT LINES
-- ==========================================

-- resource_id matches resources' insertion order above (1 Sac ciment,
-- 2 Parpaing, 3 Tube PVC, 5 Maçon qualifié, 6 Apprenti, 8 Déplacement,
-- 9 Location nacelle).
INSERT INTO document_lines
(company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, resource_id)
VALUES

-- Quote 1 (775.00) - section 1
(1, 1, 1, 'MATERIAL', 1, 'Sac ciment 25kg', 20, 'Sac', 15, 0, 1),
(1, 1, 1, 'SERVICE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0, 5),

-- Quote 2 - section 2 ("Pos 1": 1980, unchanged below).
(1, 2, 2, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0, 2),
(1, 2, 2, 'SERVICE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0, 5),
(1, 2, 2, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 8),

-- Quote 2 - section 3 ("Pos 2": 765). Combined subtotal 1980 + 765 = 2745,
-- - 5% = 2607.75 (this document's own stored amount).
(1, 2, 3, 'MATERIAL', 1, 'Peinture blanche 10L', 3, 'Pot', 95, 0, 4),
(1, 2, 3, 'SERVICE', 2, 'Electricien externe', 4, 'Heure', 120, 0, 7),

-- PROJECT CH-2026-0001 - section 4 ("Pos 1": 865). Real quantities used on
-- site, adjusted by hand from quote 1's own (20 sacs -> 22, déplacement
-- added).
(1, 3, 4, 'MATERIAL', 1, 'Sac ciment 25kg', 22, 'Sac', 15, 0, 1),
(1, 3, 4, 'SERVICE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0, 5),
(1, 3, 4, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 8),

-- PROJECT CH-2026-0001 - section 5 ("Pos 2": 205, a later addition not in
-- the original quote). Combined subtotal 865 + 205 = 1070 (this document's
-- own stored amount, no discount).
(1, 3, 5, 'MATERIAL', 1, 'Peinture blanche 10L', 1, 'Pot', 95, 0, 4),
(1, 3, 5, 'SERVICE', 2, 'Apprenti', 2, 'Heure', 55, 0, 6),

-- PROJECT CH-2026-0002 (1980.00) - section 6. Matches quote 2's own "Pos 1"
-- exactly (not its "Pos 2" - that extra finishing work was quoted but never
-- actually part of this chantier), no adjustment needed, already invoiced
-- below.
(1, 4, 6, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0, 2),
(1, 4, 6, 'SERVICE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0, 5),
(1, 4, 6, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 8),

-- PROJECT CH-2026-0003 (0.00) - section 7. Still IN_PROGRESS, no quote
-- behind it - linked by hand, nothing used on site yet.
(1, 5, 7, 'MATERIAL', 1, 'Tube PVC Ø100', 0, 'm', 22.00, 0, 3),
(1, 5, 7, 'SERVICE', 2, 'Maçon qualifié', 0, 'Heure', 95, 0, 5),

-- PROJECT CH-2026-0004 (0.00) - section 8. Same idea (apprenti, nacelle).
(1, 6, 8, 'SERVICE', 1, 'Apprenti', 0, 'Heure', 55, 0, 6),
(1, 6, 8, 'SERVICE', 2, 'Location nacelle', 0, 'Jour', 250, 0, 9),

-- Invoice FAC-2026-0001 (1881.00), bills PROJECT CH-2026-0002 - section 9,
-- same lines as that project.
(1, 7, 9, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0, 2),
(1, 7, 9, 'SERVICE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0, 5),
(1, 7, 9, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 8),

-- Invoice FAC-2026-0002 (865.00), bills PROJECT CH-2026-0001 - section 10,
-- same lines as that project's own "Pos 1" (not its "Pos 2" - the finishing
-- work billed separately later, not part of this invoice).
(1, 8, 10, 'MATERIAL', 1, 'Sac ciment 25kg', 22, 'Sac', 15, 0, 1),
(1, 8, 10, 'SERVICE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0, 5),
(1, 8, 10, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 8);

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

-- code is UNIQUE across the whole table too (same as client_number) - a
-- distinct MAT1xx/MO1xx/ST1xx/DIV1xx range, not company 1's MAT00x/etc.
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
INSERT INTO document_sections
(company_id, document_id, position, title)
VALUES
(2, 9, 1, 'Travaux'),
(2, 10, 1, 'Travaux'),
(2, 11, 1, 'Travaux'),
(2, 12, 1, 'Travaux'),
(2, 13, 1, 'Travaux'),
(2, 14, 1, 'Travaux'),
(2, 15, 1, 'Travaux'),
(2, 16, 1, 'Travaux'),
(2, 17, 1, 'Travaux'),
(2, 18, 1, 'Travaux');

-- ==========================================
-- DOCUMENT LINES
-- ==========================================

-- resource_id matches resources' insertion order above (10 Tuile terre
-- cuite, 11 Isolant laine de roche, 12 Fenêtre PVC, 13 Couvreur qualifié,
-- 14 Apprenti couvreur, 16 Déplacement, 17 Location échafaudage). Grutier
-- externe (15) is left unused, same idea as company 1's own unused
-- Electricien externe/Peinture.
INSERT INTO document_lines
(company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, resource_id)
VALUES

-- Quote 1 (2540.00) - section 11
(2, 9, 11, 'MATERIAL', 1, 'Tuile terre cuite', 200, 'Pièce', 3.20, 0, 10),
(2, 9, 11, 'SERVICE', 2, 'Couvreur qualifié', 12, 'Heure', 105, 0, 13),
(2, 9, 11, 'SERVICE', 3, 'Location échafaudage', 2, 'Semaine', 320, 0, 17),

-- Quote 2 (6985 - 5% = 6635.75) - section 12
(2, 10, 12, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 120, 'm²', 18.50, 0, 11),
(2, 10, 12, 'MATERIAL', 2, 'Fenêtre PVC triple vitrage', 4, 'Pièce', 650, 0, 12),
(2, 10, 12, 'SERVICE', 3, 'Couvreur qualifié', 20, 'Heure', 105, 0, 13),
(2, 10, 12, 'SERVICE', 4, 'Déplacement', 1, 'Forfait', 65, 0, 16),

-- Quote 3 (1597.00) - section 13
(2, 11, 13, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 2, 'Pièce', 650, 0, 12),
(2, 11, 13, 'SERVICE', 2, 'Apprenti couvreur', 4, 'Heure', 58, 0, 14),
(2, 11, 13, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 16),

-- PROJECT CH-2026-0001 (2572.00) - section 14. Real quantities used on
-- site, adjusted by hand from quote 1's own (200 tuiles -> 210).
(2, 12, 14, 'MATERIAL', 1, 'Tuile terre cuite', 210, 'Pièce', 3.20, 0, 10),
(2, 12, 14, 'SERVICE', 2, 'Couvreur qualifié', 12, 'Heure', 105, 0, 13),
(2, 12, 14, 'SERVICE', 3, 'Location échafaudage', 2, 'Semaine', 320, 0, 17),

-- PROJECT CH-2026-0002 (6635.75) - section 15. Matches quote 2's lines
-- exactly - already invoiced below.
(2, 13, 15, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 120, 'm²', 18.50, 0, 11),
(2, 13, 15, 'MATERIAL', 2, 'Fenêtre PVC triple vitrage', 4, 'Pièce', 650, 0, 12),
(2, 13, 15, 'SERVICE', 3, 'Couvreur qualifié', 20, 'Heure', 105, 0, 13),
(2, 13, 15, 'SERVICE', 4, 'Déplacement', 1, 'Forfait', 65, 0, 16),

-- PROJECT CH-2026-0003 (1597.00) - section 16. Matches quote 3's lines
-- exactly - already invoiced below (still SENT, not yet paid).
(2, 14, 16, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 2, 'Pièce', 650, 0, 12),
(2, 14, 16, 'SERVICE', 2, 'Apprenti couvreur', 4, 'Heure', 58, 0, 14),
(2, 14, 16, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 16),

-- PROJECT CH-2026-0004 (0.00) - section 17. Still IN_PROGRESS, no quote
-- behind it - linked by hand, nothing used on site yet.
(2, 15, 17, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 0, 'm²', 18.50, 0, 11),
(2, 15, 17, 'SERVICE', 2, 'Couvreur qualifié', 0, 'Heure', 105, 0, 13),

-- Invoice FAC-2026-0001 (2572.00), bills PROJECT CH-2026-0001 - section 18,
-- same lines as that project.
(2, 16, 18, 'MATERIAL', 1, 'Tuile terre cuite', 210, 'Pièce', 3.20, 0, 10),
(2, 16, 18, 'SERVICE', 2, 'Couvreur qualifié', 12, 'Heure', 105, 0, 13),
(2, 16, 18, 'SERVICE', 3, 'Location échafaudage', 2, 'Semaine', 320, 0, 17),

-- Invoice FAC-2026-0002 (6635.75), bills PROJECT CH-2026-0002 - section 19,
-- same lines as that project.
(2, 17, 19, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 120, 'm²', 18.50, 0, 11),
(2, 17, 19, 'MATERIAL', 2, 'Fenêtre PVC triple vitrage', 4, 'Pièce', 650, 0, 12),
(2, 17, 19, 'SERVICE', 3, 'Couvreur qualifié', 20, 'Heure', 105, 0, 13),
(2, 17, 19, 'SERVICE', 4, 'Déplacement', 1, 'Forfait', 65, 0, 16),

-- Invoice FAC-2026-0003 (1597.00), bills PROJECT CH-2026-0003 - section 20,
-- same lines as that project.
(2, 18, 20, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 2, 'Pièce', 650, 0, 12),
(2, 18, 20, 'SERVICE', 2, 'Apprenti couvreur', 4, 'Heure', 58, 0, 14),
(2, 18, 20, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 16);

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
