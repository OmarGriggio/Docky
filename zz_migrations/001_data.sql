-- Sample data - a full dataset so there's always something to look at.
--
-- Two separate companies (tenants):
--   1  DE DONNO STYLE Sàrl - the developer's own company.
--   2  Rénov Alpes Sàrl    - the demo company handed to recruiters.
-- Demo login: admin@demo.docky.ch / Demo2026! (ADMIN, not PLATFORM_ADMIN -
-- see CLAUDE.md's Roles section: there's no self-service way to make one of
-- those, this account only ever sees company 2's own data).
--
-- Every date is relative to the day the volume is created (CURRENT_DATE - 3,
-- CURRENT_DATE + 2...), so the calendar always has chantiers around "today"
-- and an overdue invoice stays overdue whenever this runs: chantiers worked
-- 3 days ago, 2 days ago, today, tomorrow and in 2 days.
--
-- This file runs once, on an empty volume, right after 000_base.sql, so
-- insertion order == id order: every id an INSERT refers to below is simply
-- its row's position in the matching table's own INSERT. Amounts were
-- computed the way the app itself does (recomputeDocumentTotalsServ: each
-- line's quantity x price, then the document's own discount% on top, then
-- its VAT rate) - this file bypasses the API, so keep them in sync by hand
-- if you touch a line.
--
-- What the two companies cover (each): every quote status (DRAFT, SENT,
-- ACCEPTED, REJECTED), every invoice status (DRAFT, SENT - one overdue,
-- PAID, CANCELLED), every ACCEPTED quote with its chantier - most already
-- COMPLETED and invoiced, one planned on the calendar and one still waiting
-- to be planned (sections without a date) - plus a client with a second
-- address, an archived client/resource/quote/chantier, a reference_client
-- and a document billed to a specific address.
--
-- Each company's document templates carry a 30-day default (due_days: the
-- invoice's due date / the quote's validity), and its documents' own due_date
-- is that same 30 days after their date.

-- ==========================================
-- COMPANIES
-- ==========================================

INSERT INTO companies
(name, email, phone, iban, street, postal_code, city, country, logo, header_image, vat_rate, vat_number, payment_terms)
VALUES
-- CH9300762011623852957 (company 2) is the official Swiss QR-bill spec's own
-- example IBAN, not a real account - fine here since checkIban only checks
-- length/CH-or-LI prefix, never a real checksum (see
-- pdf/swiss-qr-bill/validators/creditor.validator.ts).
('DE DONNO STYLE Sàrl', 'dedonnostyle@gmail.com', '+41799549936', 'CH8500790016247615012', 'Rue de boujean 37', '2502', 'Biel/Bienne', 'Suisse', NULL, NULL, 8.1, 'CHE-456.789.123 TVA', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.'),
('Rénov Alpes Sàrl', 'contact@renovalpes.ch', '+41798765432', 'CH9300762011623852957', 'Avenue de la Gare 22', '1950', 'Sion', 'Suisse', NULL, NULL, 8.1, 'CHE-321.654.987 TVA', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.');

-- ==========================================
-- USERS
-- ==========================================

-- One user per role on company 1 (all with the same dev password - bcrypt
-- salts each hash differently even for an identical plaintext), plus the
-- demo ADMIN of company 2. The PLATFORM_ADMIN one is inserted by hand here -
-- see the "Roles" bullet in CLAUDE.md for why there's no self-service way to
-- create one otherwise. Dev logins (company 1): password123.
INSERT INTO users
(company_id, role, last_name, first_name, email, password_hash)
VALUES
(1, 'ADMIN', 'Griggio', 'Omar', 'admin@dedonnostyle.ch', '$2b$10$iajz9XismG1lmi4UqoUE/eWKmkUbcCP0atCdq69lLJeyzLUYgxzEK'),
(1, 'USER', 'Dupont', 'Jean', 'user@dedonnostyle.ch', '$2b$10$UD0BeQiB2zuK18XQ/xarOem0Gb.cm9rrrhy0EUkBaIFU4NmK4SIa.'),
(1, 'PLATFORM_ADMIN', 'Martin', 'Alex', 'platform-admin@docky.ch', '$2b$10$5t99pOfvURFib9Z/YGDVleN//lXQGF/YR7o3t4decR/WXYvFukl92'),
(2, 'ADMIN', 'Démo', 'Admin', 'admin@demo.docky.ch', '$2b$10$RsWdYHkci6jeRUfTYl/qt.HcXY0FK0wa5OKNl2sJRIdXejkpyQ9Wy');

-- ==========================================
-- CLIENTS
-- ==========================================

-- client_number is UNIQUE across the whole table, not just per company (see
-- 000_base.sql) - C0001-C0005 company 1, C0006-C0010 company 2, C0011-C0013
-- company 1 again (C0011 is archived).
INSERT INTO clients
(company_id, client_number, type, company_name, vat_number, last_name, first_name, title, email, phone, note, is_active)
VALUES
(1, 'C0001', 'INDIVIDUAL', NULL, NULL, 'Dupont', 'Jean', 'Monsieur', 'jean.dupont@gmail.com', '0791112233', NULL, TRUE),
(1, 'C0002', 'INDIVIDUAL', NULL, NULL, 'Martin', 'Sophie', 'Madame', 'sophie.martin@gmail.com', '0792223344', NULL, TRUE),
(1, 'C0003', 'PROFESSIONAL', 'Entreprise Martin SA', 'CHE-123.456.789', NULL, NULL, 'Madame, Monsieur', 'contact@martinsa.ch', '0211112233', 'Client professionnel', TRUE),
(1, 'C0004', 'PROFESSIONAL', 'ABC Construction SA', 'CHE-987.654.321', NULL, NULL, 'Madame, Monsieur', 'info@abcconstruction.ch', '0215556677', NULL, TRUE),
(1, 'C0005', 'INDIVIDUAL', NULL, NULL, 'Durand', 'Paul', 'Monsieur', 'paul.durand@gmail.com', '0783334455', NULL, TRUE),
(2, 'C0006', 'INDIVIDUAL', NULL, NULL, 'Fournier', 'Marc', 'Monsieur', 'marc.fournier@gmail.com', '0764445566', NULL, TRUE),
(2, 'C0007', 'INDIVIDUAL', NULL, NULL, 'Bianchi', 'Elena', 'Madame', 'elena.bianchi@gmail.com', '0765556677', NULL, TRUE),
(2, 'C0008', 'PROFESSIONAL', 'Hôtel du Cervin SA', 'CHE-111.222.333', NULL, NULL, 'Madame, Monsieur', 'contact@hotelducervin.ch', '0276667788', 'Client professionnel', TRUE),
(2, 'C0009', 'PROFESSIONAL', 'Immobilière Valaisanne Sàrl', 'CHE-444.555.666', NULL, NULL, 'Madame, Monsieur', 'info@immo-valais.ch', '0278889900', 'Client professionnel', TRUE),
(2, 'C0010', 'INDIVIDUAL', NULL, NULL, 'Roduit', 'Claire', 'Madame', 'claire.roduit@gmail.com', '0767778899', NULL, TRUE),
(1, 'C0011', 'PROFESSIONAL', 'Toiture Plus Sàrl', 'CHE-222.333.444', NULL, NULL, 'Madame, Monsieur', 'contact@toitureplus.ch', '0219998877', NULL, FALSE),
(1, 'C0012', 'INDIVIDUAL', NULL, NULL, 'Bertrand', 'Lucie', 'Madame', 'lucie.bertrand@gmail.com', '0761234567', NULL, TRUE),
(1, 'C0013', 'INDIVIDUAL', NULL, NULL, 'Moser', 'Thomas', 'Monsieur', 'thomas.moser@gmail.com', '0789876543', NULL, TRUE);

-- ==========================================
-- ADDRESSES
-- ==========================================

-- One primary address per client, plus a second (non-primary) one for client 3
-- (Entreprise Martin SA) - its own site, different from its HQ - which a
-- chantier and two invoices below are billed to specifically.
INSERT INTO addresses
(company_id, client_id, is_primary, attention, street, postal_code, city, country)
VALUES
(1, 1, TRUE, NULL, 'Rue de Lausanne 12', '1000', 'Lausanne', 'Suisse'),
(1, 2, TRUE, NULL, 'Route de Genève 5', '1007', 'Lausanne', 'Suisse'),
(1, 3, TRUE, NULL, 'Rue Centrale 18', '1020', 'Renens', 'Suisse'),
(1, 4, TRUE, NULL, 'Chemin du Bois 45', '1008', 'Prilly', 'Suisse'),
(1, 5, TRUE, NULL, 'Avenue des Alpes 9', '1800', 'Vevey', 'Suisse'),
(2, 6, TRUE, NULL, 'Rue du Rhône 14', '1950', 'Sion', 'Suisse'),
(2, 7, TRUE, NULL, 'Route de Riddes 8', '1908', 'Riddes', 'Suisse'),
(2, 8, TRUE, NULL, 'Rue du Cervin 3', '3920', 'Zermatt', 'Suisse'),
(2, 9, TRUE, NULL, 'Avenue de la Gare 40', '1950', 'Sion', 'Suisse'),
(2, 10, TRUE, NULL, 'Chemin des Vignes 6', '1963', 'Vétroz', 'Suisse'),
(1, 3, FALSE, 'Site de Renens', 'Route Industrielle 8', '1020', 'Renens', 'Suisse'),
(1, 11, TRUE, NULL, 'Rue de la Gare 3', '1003', 'Lausanne', 'Suisse'),
(1, 12, TRUE, NULL, 'Chemin des Fleurs 7', '1010', 'Lausanne', 'Suisse'),
(1, 13, TRUE, NULL, 'Avenue de la Praille 22', '1227', 'Carouge', 'Suisse');

-- ==========================================
-- RESOURCES
-- ==========================================

-- code is unique per (company_id, code) among active resources (see
-- 000_base.sql), so both companies can reuse MAT101/102/103.
INSERT INTO resources
(company_id, parent_resource_id, type, code, name, unit, selling_price, purchase_price, is_active)
VALUES
(1, NULL, 'MATERIAL', 'MAT101', 'Tuile terre cuite', 'Pièce', 3.2, 1.8, TRUE),
(1, NULL, 'MATERIAL', 'MAT102', 'Isolant laine de roche 100mm', 'm²', 18.5, 12, TRUE),
(1, NULL, 'MATERIAL', 'MAT103', 'Fenêtre PVC triple vitrage', 'Pièce', 650, 420, TRUE),
(1, NULL, 'MATERIAL', 'MAT001', 'Sac ciment 25kg', 'Sac', 15, 8.5, TRUE),
(1, NULL, 'MATERIAL', 'MAT002', 'Parpaing 20 cm', 'Pièce', 4.5, 2.8, TRUE),
(1, NULL, 'MATERIAL', 'MAT003', 'Tube PVC Ø100', 'm', 22, 15, TRUE),
(1, NULL, 'MATERIAL', 'MAT004', 'Peinture blanche 10L', 'Pot', 95, 70, TRUE),
(1, NULL, 'SERVICE', 'APPR-1', 'Apprenti 1ère', 'Heure', 40, NULL, TRUE),
(1, NULL, 'SERVICE', 'APPR-2', 'Apprenti 2ème', 'Heure', 40, NULL, TRUE),
(1, NULL, 'SERVICE', 'APPR-3', 'Apprenti 3ème', 'Heure', 50, NULL, TRUE),
(1, NULL, 'SERVICE', 'APPR-4', 'Apprenti 4ème', 'Heure', 60, NULL, TRUE),
(1, NULL, 'SERVICE', 'MEN-A', 'Menusier A', 'Heure', 140, NULL, TRUE),
(1, NULL, 'SERVICE', 'MEN-B', 'Menusier B', 'Heure', 110, NULL, TRUE),
(1, NULL, 'SERVICE', 'MEN-C', 'Menusier C', 'Heure', 90, NULL, TRUE),
(1, NULL, 'SERVICE', 'MAC-1', 'Maçon qualifié', 'Heure', 95, NULL, TRUE),
(1, NULL, 'SERVICE', 'ELEC-1', 'Electricien externe', 'Heure', 120, 90, TRUE),
(1, NULL, 'SERVICE', 'MO003', 'Chef de chantier', 'Heure', 110, NULL, TRUE),
(1, NULL, 'SERVICE', 'DEP-1', 'Déplacement', 'Forfait', 60, NULL, TRUE),
(1, NULL, 'SERVICE', 'NAC-1', 'Location nacelle', 'Jour', 250, 180, TRUE),
(1, NULL, 'MATERIAL', 'MAT005', 'Brique réfractaire', 'Pièce', 6.5, 4, FALSE),
(2, NULL, 'MATERIAL', 'MAT101', 'Tuile terre cuite', 'Pièce', 3.2, 1.8, TRUE),
(2, NULL, 'MATERIAL', 'MAT102', 'Isolant laine de roche 100mm', 'm²', 18.5, 12, TRUE),
(2, NULL, 'MATERIAL', 'MAT103', 'Fenêtre PVC triple vitrage', 'Pièce', 650, 420, TRUE),
(2, NULL, 'MATERIAL', 'MAT104', 'Chéneau zinc', 'm', 38, 24, TRUE),
(2, NULL, 'MATERIAL', 'MAT105', 'Lucarne de toit', 'Pièce', 1450, 980, TRUE),
(2, NULL, 'SERVICE', 'MO101', 'Couvreur qualifié', 'Heure', 105, NULL, TRUE),
(2, NULL, 'SERVICE', 'MO102', 'Apprenti couvreur', 'Heure', 58, NULL, TRUE),
(2, NULL, 'SERVICE', 'ST101', 'Grutier externe', 'Heure', 140, 100, TRUE),
(2, NULL, 'SERVICE', 'DIV101', 'Déplacement', 'Forfait', 65, NULL, TRUE),
(2, NULL, 'SERVICE', 'DIV102', 'Location échafaudage', 'Semaine', 320, 220, TRUE);

-- The unit picker's list, per company.
INSERT INTO resource_units (company_id, label)
VALUES
(1, 'Heure'),
(1, 'Jour'),
(1, 'Semaine'),
(1, 'Forfait'),
(1, 'Pièce'),
(1, 'Sac'),
(1, 'Pot'),
(1, 'm'),
(1, 'm²'),
(1, 'kg'),
(2, 'Heure'),
(2, 'Jour'),
(2, 'Semaine'),
(2, 'Forfait'),
(2, 'Pièce'),
(2, 'Sac'),
(2, 'Pot'),
(2, 'm'),
(2, 'm²'),
(2, 'kg');

-- ==========================================
-- PROJECT TYPES
-- ==========================================

-- A global lookup - no company_id, shared by every tenant.
INSERT INTO project_types (label)
VALUES
('Porte'),
('Cuisines'),
('Salle de bain'),
('Réparation'),
('Isolation'),
('Autre'),
('Toiture'),
('Fenêtres');

-- ==========================================
-- DOCUMENTS
-- ==========================================

-- Quotes, chantiers (type PROJECT - the work itself, its own sections/lines are
-- its resource ledger) and invoices, company 1 then company 2. A PROJECT's
-- parent_document_id is the quote it was accepted from (NULL for a manual
-- chantier); an invoice's is the chantier it bills (NULL for a standalone
-- one). Ids run in the order below.
INSERT INTO documents
(company_id, client_id, address_id, reference_client, parent_document_id, type, number, date, amount_excl_vat, amount_incl_vat, discount, vat_rate, status, introduction, conclusion, payment_terms, due_date, is_active)
VALUES
(1, 1, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0001', CURRENT_DATE - 60, 775, 837.78, 0, 8.1, 'ACCEPTED', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 30, TRUE),
(1, 3, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0002', CURRENT_DATE - 20, 2607.75, 2818.98, 5, 8.1, 'ACCEPTED', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 10, TRUE),
(1, 12, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0003', CURRENT_DATE - 10, 0, 0, 0, 8.1, 'DRAFT', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 20, TRUE),
(1, 13, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0004', CURRENT_DATE - 10, 980, 1059.38, 0, 8.1, 'SENT', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 20, TRUE),
(1, 13, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0005', CURRENT_DATE - 40, 340, 367.54, 0, 8.1, 'REJECTED', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 10, FALSE),
(1, 4, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0006', CURRENT_DATE - 8, 3330, 3599.73, 0, 8.1, 'ACCEPTED', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 22, TRUE),
(1, 5, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0007', CURRENT_DATE - 5, 4140, 4475.34, 0, 8.1, 'ACCEPTED', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 25, TRUE),
(1, 1, NULL, NULL, 1, 'PROJECT', 'CH-2026-0001', CURRENT_DATE - 55, 1060, 1060, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(1, 3, 11, NULL, 2, 'PROJECT', 'CH-2026-0002', CURRENT_DATE - 18, 1980, 1980, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(1, 2, NULL, NULL, NULL, 'PROJECT', 'CH-2026-0003', CURRENT_DATE - 50, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(1, 2, NULL, NULL, NULL, 'PROJECT', 'CH-2026-0004', CURRENT_DATE - 49, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(1, 12, NULL, NULL, NULL, 'PROJECT', 'CH-2026-0005', CURRENT_DATE - 35, 680, 680, 0, 0, NULL, NULL, NULL, NULL, NULL, FALSE),
(1, 4, NULL, NULL, 6, 'PROJECT', 'CH-2026-0006', CURRENT_DATE - 6, 3770, 3770, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(1, 5, NULL, NULL, 7, 'PROJECT', 'CH-2026-0007', CURRENT_DATE - 4, 4140, 4140, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(1, 3, 11, NULL, 9, 'INVOICE', 'FAC-2026-0001', CURRENT_DATE - 2, 1881, 2033.36, 5, 8.1, 'PAID', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 28, TRUE),
(1, 1, NULL, NULL, 8, 'INVOICE', 'FAC-2026-0002', CURRENT_DATE - 45, 865, 935.07, 0, 8.1, 'SENT', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 15, TRUE),
(1, 3, NULL, NULL, NULL, 'INVOICE', 'FAC-2026-0003', CURRENT_DATE - 38, 75, 81.08, 0, 8.1, 'CANCELLED', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 8, TRUE),
(1, 4, NULL, 'BC-2026-445', NULL, 'INVOICE', 'FAC-2026-0004', CURRENT_DATE - 1, 780, 843.18, 0, 8.1, 'DRAFT', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 29, TRUE),
(1, 3, 11, NULL, NULL, 'INVOICE', 'FAC-2026-0005', CURRENT_DATE - 33, 1462.5, 1580.96, 10, 8.1, 'PAID', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 3, TRUE),
(1, 1, NULL, NULL, NULL, 'INVOICE', 'FAC-2026-0006', CURRENT_DATE - 28, 530, 572.93, 0, 8.1, 'PAID', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 2, TRUE),
(1, 5, NULL, NULL, NULL, 'INVOICE', 'FAC-2026-0007', CURRENT_DATE - 26, 610, 659.41, 0, 8.1, 'PAID', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 4, TRUE),
(2, 8, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0001', CURRENT_DATE - 90, 2540, 2745.74, 0, 8.1, 'ACCEPTED', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 60, TRUE),
(2, 9, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0002', CURRENT_DATE - 70, 6635.75, 7173.25, 5, 8.1, 'ACCEPTED', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 40, TRUE),
(2, 10, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0003', CURRENT_DATE - 65, 1597, 1726.36, 0, 8.1, 'ACCEPTED', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 35, TRUE),
(2, 7, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0004', CURRENT_DATE - 30, 2179, 2355.5, 0, 8.1, 'ACCEPTED', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE, TRUE),
(2, 6, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0005', CURRENT_DATE - 20, 2645, 2859.25, 0, 8.1, 'ACCEPTED', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 10, TRUE),
(2, 8, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0006', CURRENT_DATE - 6, 12660, 13685.46, 0, 8.1, 'SENT', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 24, TRUE),
(2, 9, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0007', CURRENT_DATE - 2, 6760, 7307.56, 0, 8.1, 'DRAFT', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 28, TRUE),
(2, 10, NULL, NULL, NULL, 'QUOTE', 'OFF-2026-0008', CURRENT_DATE - 50, 824, 890.74, 0, 8.1, 'REJECTED', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 20, FALSE),
(2, 8, NULL, NULL, 22, 'PROJECT', 'CH-2026-0001', CURRENT_DATE - 88, 2572, 2572, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(2, 9, NULL, NULL, 23, 'PROJECT', 'CH-2026-0002', CURRENT_DATE - 68, 6985, 6985, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(2, 10, NULL, NULL, 24, 'PROJECT', 'CH-2026-0003', CURRENT_DATE - 63, 1597, 1597, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(2, 6, NULL, NULL, NULL, 'PROJECT', 'CH-2026-0004', CURRENT_DATE - 60, 905, 905, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(2, 7, NULL, NULL, 25, 'PROJECT', 'CH-2026-0005', CURRENT_DATE - 28, 2179, 2179, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(2, 6, NULL, NULL, 26, 'PROJECT', 'CH-2026-0006', CURRENT_DATE - 18, 2645, 2645, 0, 0, NULL, NULL, NULL, NULL, NULL, TRUE),
(2, 8, NULL, NULL, 30, 'INVOICE', 'FAC-2026-0001', CURRENT_DATE - 2, 2572, 2780.33, 0, 8.1, 'PAID', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 28, TRUE),
(2, 9, NULL, NULL, 31, 'INVOICE', 'FAC-2026-0002', CURRENT_DATE - 46, 6635.75, 7173.25, 5, 8.1, 'PAID', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 16, TRUE),
(2, 10, NULL, NULL, 32, 'INVOICE', 'FAC-2026-0003', CURRENT_DATE - 55, 1597, 1726.36, 0, 8.1, 'SENT', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 25, TRUE),
(2, 7, NULL, 'Commande 2026-118', NULL, 'INVOICE', 'FAC-2026-0004', CURRENT_DATE - 1, 695, 751.3, 0, 8.1, 'DRAFT', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 29, TRUE),
(2, 6, NULL, NULL, NULL, 'INVOICE', 'FAC-2026-0005', CURRENT_DATE - 40, 239, 258.36, 0, 8.1, 'CANCELLED', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE - 10, TRUE),
(2, 8, NULL, NULL, NULL, 'INVOICE', 'FAC-2026-0006', CURRENT_DATE - 5, 485, 524.29, 0, 8.1, 'SENT', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 'Paiement à 30 jours net, sans escompte.
En cas de retard de paiement, un intérêt moratoire de 5 % l''an sera perçu.', CURRENT_DATE + 25, TRUE);

-- ==========================================
-- DOCUMENT SECTIONS
-- ==========================================

-- A quote's or invoice's sections carry no schedule (the form has no
-- scheduling UI); a chantier's do - a section with a date shows on the
-- calendar, one without is a chantier still waiting to be planned.
INSERT INTO document_sections
(company_id, document_id, position, title, description, date_start, date_end, is_active)
VALUES
(1, 1, 1, 'Réparation de la porte de cave', NULL, NULL, NULL, TRUE),
(1, 2, 1, 'Maçonnerie', NULL, NULL, NULL, TRUE),
(1, 2, 2, 'Finitions', 'Peinture et raccordement électrique', NULL, NULL, TRUE),
(1, 4, 1, 'Canalisation', NULL, NULL, NULL, TRUE),
(1, 5, 1, 'Peinture', NULL, NULL, NULL, FALSE),
(1, 6, 1, 'Remplacement des fenêtres', NULL, NULL, NULL, TRUE),
(1, 7, 1, 'Isolation de façade', NULL, NULL, NULL, TRUE),
(1, 8, 1, 'Réparation de la porte de cave', NULL, CURRENT_DATE - 50 + TIME '08:00', CURRENT_DATE - 50 + TIME '16:30', TRUE),
(1, 8, 2, 'Peinture et finitions', NULL, CURRENT_DATE - 49 + TIME '08:00', CURRENT_DATE - 49 + TIME '15:00', TRUE),
(1, 9, 1, 'Maçonnerie', NULL, CURRENT_DATE - 3 + TIME '08:00', CURRENT_DATE - 3 + TIME '17:00', TRUE),
(1, 10, 1, 'Travaux', NULL, NULL, NULL, TRUE),
(1, 11, 1, 'Travaux', NULL, NULL, NULL, TRUE),
(1, 12, 1, 'Travaux', NULL, NULL, NULL, FALSE),
(1, 13, 1, 'Remplacement des fenêtres', NULL, CURRENT_DATE + TIME '08:00', CURRENT_DATE + TIME '17:00', TRUE),
(1, 13, 2, 'Finitions', 'Reprises d''enduit et joints', CURRENT_DATE + 2 + TIME '08:00', CURRENT_DATE + 2 + TIME '12:00', TRUE),
(1, 14, 1, 'Isolation de façade', NULL, NULL, NULL, TRUE),
(1, 15, 1, 'Maçonnerie', NULL, NULL, NULL, TRUE),
(1, 16, 1, 'Réparation de la porte de cave', NULL, NULL, NULL, TRUE),
(1, 17, 1, 'Fourniture', NULL, NULL, NULL, TRUE),
(1, 18, 1, 'Travaux électriques', NULL, NULL, NULL, TRUE),
(1, 19, 1, 'Maçonnerie', NULL, NULL, NULL, TRUE),
(1, 20, 1, 'Travaux', NULL, NULL, NULL, TRUE),
(1, 21, 1, 'Travaux', NULL, NULL, NULL, TRUE),
(2, 22, 1, 'Réfection de toiture', NULL, NULL, NULL, TRUE),
(2, 23, 1, 'Isolation et fenêtres', NULL, NULL, NULL, TRUE),
(2, 24, 1, 'Remplacement de fenêtres', NULL, NULL, NULL, TRUE),
(2, 25, 1, 'Chéneaux et gouttières', NULL, NULL, NULL, TRUE),
(2, 26, 1, 'Isolation des combles', NULL, NULL, NULL, TRUE),
(2, 27, 1, 'Lucarnes', NULL, NULL, NULL, TRUE),
(2, 27, 2, 'Fenêtres', NULL, NULL, NULL, TRUE),
(2, 27, 3, 'Logistique', NULL, NULL, NULL, TRUE),
(2, 28, 1, 'Réfection de toiture', NULL, NULL, NULL, TRUE),
(2, 29, 1, 'Fenêtre de toit', NULL, NULL, NULL, FALSE),
(2, 30, 1, 'Réfection de toiture', NULL, CURRENT_DATE - 3 + TIME '07:00', CURRENT_DATE - 3 + TIME '17:00', TRUE),
(2, 31, 1, 'Isolation et fenêtres', NULL, CURRENT_DATE - 50 + TIME '07:00', CURRENT_DATE - 50 + TIME '17:00', TRUE),
(2, 32, 1, 'Remplacement de fenêtres', NULL, CURRENT_DATE - 60 + TIME '08:00', CURRENT_DATE - 60 + TIME '17:00', TRUE),
(2, 33, 1, 'Entretien', NULL, CURRENT_DATE - 2 + TIME '07:00', CURRENT_DATE - 2 + TIME '16:00', TRUE),
(2, 34, 1, 'Chéneaux et gouttières', NULL, CURRENT_DATE + 1 + TIME '07:00', CURRENT_DATE + 1 + TIME '17:00', TRUE),
(2, 35, 1, 'Isolation des combles', NULL, NULL, NULL, TRUE),
(2, 36, 1, 'Réfection de toiture', NULL, NULL, NULL, TRUE),
(2, 37, 1, 'Isolation et fenêtres', NULL, NULL, NULL, TRUE),
(2, 38, 1, 'Remplacement de fenêtres', NULL, NULL, NULL, TRUE),
(2, 39, 1, 'Réparation de toiture', NULL, NULL, NULL, TRUE),
(2, 40, 1, 'Petits travaux', NULL, NULL, NULL, TRUE),
(2, 41, 1, 'Entretien annuel', NULL, NULL, NULL, TRUE);

-- ==========================================
-- DOCUMENT LINES
-- ==========================================

-- Every line comes from the catalog (resource_id): label, unit and price are
-- the resource's own.
INSERT INTO document_lines
(company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, resource_id, is_active)
VALUES
(1, 1, 1, 'MATERIAL', 1, 'Sac ciment 25kg', 20, 'Sac', 15, 0, 4, TRUE),
(1, 1, 1, 'SERVICE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0, 15, TRUE),
(1, 2, 2, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.5, 0, 5, TRUE),
(1, 2, 2, 'SERVICE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0, 15, TRUE),
(1, 2, 2, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 18, TRUE),
(1, 2, 3, 'MATERIAL', 1, 'Peinture blanche 10L', 3, 'Pot', 95, 0, 7, TRUE),
(1, 2, 3, 'SERVICE', 2, 'Electricien externe', 4, 'Heure', 120, 0, 16, TRUE),
(1, 4, 4, 'MATERIAL', 1, 'Tube PVC Ø100', 10, 'm', 22, 0, 6, TRUE),
(1, 4, 4, 'SERVICE', 2, 'Maçon qualifié', 8, 'Heure', 95, 0, 15, TRUE),
(1, 5, 5, 'MATERIAL', 1, 'Peinture blanche 10L', 2, 'Pot', 95, 0, 7, FALSE),
(1, 5, 5, 'SERVICE', 2, 'Apprenti 3ème', 3, 'Heure', 50, 0, 10, FALSE),
(1, 6, 6, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 3, 'Pièce', 650, 0, 3, TRUE),
(1, 6, 6, 'SERVICE', 2, 'Menusier B', 12, 'Heure', 110, 0, 13, TRUE),
(1, 6, 6, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 18, TRUE),
(1, 7, 7, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 80, 'm²', 18.5, 0, 2, TRUE),
(1, 7, 7, 'SERVICE', 2, 'Menusier C', 24, 'Heure', 90, 0, 14, TRUE),
(1, 7, 7, 'SERVICE', 3, 'Location nacelle', 2, 'Jour', 250, 0, 19, TRUE),
(1, 8, 8, 'MATERIAL', 1, 'Sac ciment 25kg', 22, 'Sac', 15, 0, 4, TRUE),
(1, 8, 8, 'SERVICE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0, 15, TRUE),
(1, 8, 8, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 18, TRUE),
(1, 8, 9, 'MATERIAL', 1, 'Peinture blanche 10L', 1, 'Pot', 95, 0, 7, TRUE),
(1, 8, 9, 'SERVICE', 2, 'Apprenti 3ème', 2, 'Heure', 50, 0, 10, TRUE),
(1, 9, 10, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.5, 0, 5, TRUE),
(1, 9, 10, 'SERVICE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0, 15, TRUE),
(1, 9, 10, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 18, TRUE),
(1, 10, 11, 'MATERIAL', 1, 'Tube PVC Ø100', 0, 'm', 22, 0, 6, TRUE),
(1, 10, 11, 'SERVICE', 2, 'Maçon qualifié', 0, 'Heure', 95, 0, 15, TRUE),
(1, 11, 12, 'SERVICE', 1, 'Apprenti 3ème', 0, 'Heure', 50, 0, 10, TRUE),
(1, 11, 12, 'SERVICE', 2, 'Location nacelle', 0, 'Jour', 250, 0, 19, TRUE),
(1, 12, 13, 'SERVICE', 1, 'Chef de chantier', 5, 'Heure', 110, 0, 17, FALSE),
(1, 12, 13, 'MATERIAL', 2, 'Brique réfractaire', 20, 'Pièce', 6.5, 0, 20, FALSE),
(1, 13, 14, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 3, 'Pièce', 650, 0, 3, TRUE),
(1, 13, 14, 'SERVICE', 2, 'Menusier B', 12, 'Heure', 110, 0, 13, TRUE),
(1, 13, 14, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 18, TRUE),
(1, 13, 15, 'SERVICE', 1, 'Menusier B', 4, 'Heure', 110, 0, 13, TRUE),
(1, 14, 16, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 80, 'm²', 18.5, 0, 2, TRUE),
(1, 14, 16, 'SERVICE', 2, 'Menusier C', 24, 'Heure', 90, 0, 14, TRUE),
(1, 14, 16, 'SERVICE', 3, 'Location nacelle', 2, 'Jour', 250, 0, 19, TRUE),
(1, 15, 17, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.5, 0, 5, TRUE),
(1, 15, 17, 'SERVICE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0, 15, TRUE),
(1, 15, 17, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 18, TRUE),
(1, 16, 18, 'MATERIAL', 1, 'Sac ciment 25kg', 22, 'Sac', 15, 0, 4, TRUE),
(1, 16, 18, 'SERVICE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0, 15, TRUE),
(1, 16, 18, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 18, TRUE),
(1, 17, 19, 'MATERIAL', 1, 'Sac ciment 25kg', 5, 'Sac', 15, 0, 4, TRUE),
(1, 18, 20, 'SERVICE', 1, 'Electricien externe', 6, 'Heure', 120, 0, 16, TRUE),
(1, 18, 20, 'SERVICE', 2, 'Déplacement', 1, 'Forfait', 60, 0, 18, TRUE),
(1, 19, 21, 'MATERIAL', 1, 'Parpaing 20 cm', 150, 'Pièce', 4.5, 0, 5, TRUE),
(1, 19, 21, 'SERVICE', 2, 'Maçon qualifié', 10, 'Heure', 95, 0, 15, TRUE),
(1, 20, 22, 'MATERIAL', 1, 'Sac ciment 25kg', 10, 'Sac', 15, 0, 4, TRUE),
(1, 20, 22, 'SERVICE', 2, 'Maçon qualifié', 4, 'Heure', 95, 0, 15, TRUE),
(1, 21, 23, 'MATERIAL', 1, 'Parpaing 20 cm', 80, 'Pièce', 4.5, 0, 5, TRUE),
(1, 21, 23, 'SERVICE', 2, 'Apprenti 3ème', 5, 'Heure', 50, 0, 10, TRUE),
(2, 22, 24, 'MATERIAL', 1, 'Tuile terre cuite', 200, 'Pièce', 3.2, 0, 21, TRUE),
(2, 22, 24, 'SERVICE', 2, 'Couvreur qualifié', 12, 'Heure', 105, 0, 26, TRUE),
(2, 22, 24, 'SERVICE', 3, 'Location échafaudage', 2, 'Semaine', 320, 0, 30, TRUE),
(2, 23, 25, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 120, 'm²', 18.5, 0, 22, TRUE),
(2, 23, 25, 'MATERIAL', 2, 'Fenêtre PVC triple vitrage', 4, 'Pièce', 650, 0, 23, TRUE),
(2, 23, 25, 'SERVICE', 3, 'Couvreur qualifié', 20, 'Heure', 105, 0, 26, TRUE),
(2, 23, 25, 'SERVICE', 4, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 24, 26, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 2, 'Pièce', 650, 0, 23, TRUE),
(2, 24, 26, 'SERVICE', 2, 'Apprenti couvreur', 4, 'Heure', 58, 0, 27, TRUE),
(2, 24, 26, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 25, 27, 'MATERIAL', 1, 'Chéneau zinc', 28, 'm', 38, 0, 24, TRUE),
(2, 25, 27, 'SERVICE', 2, 'Couvreur qualifié', 10, 'Heure', 105, 0, 26, TRUE),
(2, 25, 27, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 26, 28, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 60, 'm²', 18.5, 0, 22, TRUE),
(2, 26, 28, 'SERVICE', 2, 'Couvreur qualifié', 14, 'Heure', 105, 0, 26, TRUE),
(2, 26, 28, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 27, 29, 'MATERIAL', 1, 'Lucarne de toit', 2, 'Pièce', 1450, 0, 25, TRUE),
(2, 27, 29, 'SERVICE', 2, 'Couvreur qualifié', 24, 'Heure', 105, 0, 26, TRUE),
(2, 27, 30, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 6, 'Pièce', 650, 0, 23, TRUE),
(2, 27, 30, 'SERVICE', 2, 'Couvreur qualifié', 12, 'Heure', 105, 0, 26, TRUE),
(2, 27, 31, 'SERVICE', 1, 'Grutier externe', 8, 'Heure', 140, 0, 28, TRUE),
(2, 27, 31, 'SERVICE', 2, 'Location échafaudage', 3, 'Semaine', 320, 0, 30, TRUE),
(2, 28, 32, 'MATERIAL', 1, 'Tuile terre cuite', 800, 'Pièce', 3.2, 0, 21, TRUE),
(2, 28, 32, 'SERVICE', 2, 'Couvreur qualifié', 40, 'Heure', 105, 0, 26, TRUE),
(2, 29, 33, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 1, 'Pièce', 650, 0, 23, FALSE),
(2, 29, 33, 'SERVICE', 2, 'Apprenti couvreur', 3, 'Heure', 58, 0, 27, FALSE),
(2, 30, 34, 'MATERIAL', 1, 'Tuile terre cuite', 210, 'Pièce', 3.2, 0, 21, TRUE),
(2, 30, 34, 'SERVICE', 2, 'Couvreur qualifié', 12, 'Heure', 105, 0, 26, TRUE),
(2, 30, 34, 'SERVICE', 3, 'Location échafaudage', 2, 'Semaine', 320, 0, 30, TRUE),
(2, 31, 35, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 120, 'm²', 18.5, 0, 22, TRUE),
(2, 31, 35, 'MATERIAL', 2, 'Fenêtre PVC triple vitrage', 4, 'Pièce', 650, 0, 23, TRUE),
(2, 31, 35, 'SERVICE', 3, 'Couvreur qualifié', 20, 'Heure', 105, 0, 26, TRUE),
(2, 31, 35, 'SERVICE', 4, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 32, 36, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 2, 'Pièce', 650, 0, 23, TRUE),
(2, 32, 36, 'SERVICE', 2, 'Apprenti couvreur', 4, 'Heure', 58, 0, 27, TRUE),
(2, 32, 36, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 33, 37, 'SERVICE', 1, 'Couvreur qualifié', 8, 'Heure', 105, 0, 26, TRUE),
(2, 33, 37, 'SERVICE', 2, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 34, 38, 'MATERIAL', 1, 'Chéneau zinc', 28, 'm', 38, 0, 24, TRUE),
(2, 34, 38, 'SERVICE', 2, 'Couvreur qualifié', 10, 'Heure', 105, 0, 26, TRUE),
(2, 34, 38, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 35, 39, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 60, 'm²', 18.5, 0, 22, TRUE),
(2, 35, 39, 'SERVICE', 2, 'Couvreur qualifié', 14, 'Heure', 105, 0, 26, TRUE),
(2, 35, 39, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 36, 40, 'MATERIAL', 1, 'Tuile terre cuite', 210, 'Pièce', 3.2, 0, 21, TRUE),
(2, 36, 40, 'SERVICE', 2, 'Couvreur qualifié', 12, 'Heure', 105, 0, 26, TRUE),
(2, 36, 40, 'SERVICE', 3, 'Location échafaudage', 2, 'Semaine', 320, 0, 30, TRUE),
(2, 37, 41, 'MATERIAL', 1, 'Isolant laine de roche 100mm', 120, 'm²', 18.5, 0, 22, TRUE),
(2, 37, 41, 'MATERIAL', 2, 'Fenêtre PVC triple vitrage', 4, 'Pièce', 650, 0, 23, TRUE),
(2, 37, 41, 'SERVICE', 3, 'Couvreur qualifié', 20, 'Heure', 105, 0, 26, TRUE),
(2, 37, 41, 'SERVICE', 4, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 38, 42, 'MATERIAL', 1, 'Fenêtre PVC triple vitrage', 2, 'Pièce', 650, 0, 23, TRUE),
(2, 38, 42, 'SERVICE', 2, 'Apprenti couvreur', 4, 'Heure', 58, 0, 27, TRUE),
(2, 38, 42, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 39, 43, 'SERVICE', 1, 'Couvreur qualifié', 6, 'Heure', 105, 0, 26, TRUE),
(2, 39, 43, 'SERVICE', 2, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 40, 44, 'SERVICE', 1, 'Apprenti couvreur', 3, 'Heure', 58, 0, 27, TRUE),
(2, 40, 44, 'SERVICE', 2, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE),
(2, 41, 45, 'SERVICE', 1, 'Couvreur qualifié', 4, 'Heure', 105, 0, 26, TRUE),
(2, 41, 45, 'SERVICE', 2, 'Déplacement', 1, 'Forfait', 65, 0, 29, TRUE);

-- ==========================================
-- DOCUMENT TEMPLATES
-- ==========================================

-- The default introduction/conclusion of a new quote/invoice ({{placeholders}}
-- are filled in when the PDF is generated), with a 30-day default due date /
-- validity. No REMINDER row: the backend falls back to its own default text
-- until a company writes one.
INSERT INTO document_templates
(company_id, type, introduction, conclusion, due_days)
VALUES
(1, 'INVOICE', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 30),
(1, 'QUOTE', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 30),
(2, 'INVOICE', '{{titre_client}},

C''est avec plaisir que nous vous transmettons la facture ci-dessous, établie conformément à nos accords. Nous restons à votre entière disposition pour toute question.', 'Nous vous remercions pour votre confiance et vous souhaitons, Madame, Monsieur, nos salutations les meilleures.

{{signature_entreprise}}', 30),
(2, 'QUOTE', '{{titre_client}},

Nous avons le plaisir de vous soumettre notre offre pour les travaux décrits ci-dessous.', 'Cette offre est valable 30 jours à compter de sa date d''émission. Nous restons à votre disposition pour toute question.

Avec nos meilleures salutations.

{{signature_entreprise}}', 30);

-- ==========================================
-- PROJECTS
-- ==========================================

-- One row per chantier document above. COMPLETED unlocks invoicing.
INSERT INTO projects
(company_id, document_id, client_id, project_type_id, name, note, status, is_active)
VALUES
(1, 8, 1, 1, 'Réparation de porte de cave', NULL, 'COMPLETED', TRUE),
(1, 9, 3, 2, 'Création de cuisine sur mesure', NULL, 'COMPLETED', TRUE),
(1, 10, 2, 3, 'Réparation de meuble de salle de bain', NULL, 'IN_PROGRESS', TRUE),
(1, 11, 2, 4, 'Posage de l''isolation', NULL, 'IN_PROGRESS', TRUE),
(1, 12, 12, NULL, 'Rénovation façade', 'Chantier suspendu - à reprendre', 'IN_PROGRESS', FALSE),
(1, 13, 4, 8, 'Remplacement des fenêtres du dépôt', NULL, 'IN_PROGRESS', TRUE),
(1, 14, 5, 5, 'Isolation de façade', NULL, 'IN_PROGRESS', TRUE),
(2, 30, 8, 7, 'Rénovation toiture hôtel', NULL, 'COMPLETED', TRUE),
(2, 31, 9, 5, 'Isolation et fenêtres immeuble', NULL, 'COMPLETED', TRUE),
(2, 32, 10, 8, 'Remplacement fenêtres', NULL, 'COMPLETED', TRUE),
(2, 33, 6, 6, 'Entretien toiture chalet', NULL, 'IN_PROGRESS', TRUE),
(2, 34, 7, 7, 'Chéneaux et gouttières', NULL, 'IN_PROGRESS', TRUE),
(2, 35, 6, 5, 'Isolation des combles', NULL, 'IN_PROGRESS', TRUE);

-- ==========================================
-- CALENDAR NOTES
-- ==========================================

-- Free-standing calendar entries, not tied to a chantier (Zurich local time).
INSERT INTO calendar_notes
(company_id, title, description, date_start, date_end)
VALUES
(1, 'Réunion de chantier - Renens', 'Point avec le client sur le planning des fenêtres.', (CURRENT_DATE + 1 + TIME '09:00') AT TIME ZONE 'Europe/Zurich', (CURRENT_DATE + 1 + TIME '10:00') AT TIME ZONE 'Europe/Zurich'),
(1, 'Commande de matériel', 'Isolant et échafaudage pour la façade.', (CURRENT_DATE + 3 + TIME '08:00') AT TIME ZONE 'Europe/Zurich', (CURRENT_DATE + 3 + TIME '09:00') AT TIME ZONE 'Europe/Zurich'),
(2, 'Visite de repérage - Zermatt', 'Toiture de l''hôtel : relevé pour la prochaine offre.', (CURRENT_DATE + 2 + TIME '14:00') AT TIME ZONE 'Europe/Zurich', (CURRENT_DATE + 2 + TIME '15:30') AT TIME ZONE 'Europe/Zurich');
