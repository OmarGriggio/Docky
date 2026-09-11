INSERT INTO companies
(name, email, phone, iban, street, postal_code, city, country, logo)
VALUES
('DE DONNO STYLE Sàrl', 'dedonnostyle@gmail.com', '+41799549936', 'CH8500790016247615012', 'Rue de boujean 37', '2502', 'Biel/Bienne', 'Suisse', NULL);

-- ==========================================
-- USERS
-- ==========================================

-- One user per role, all with the same dev password (password123) - bcrypt
-- salts each hash differently even for an identical plaintext, so this
-- doesn't collide with password_hash's UNIQUE constraint.
-- Dev seed logins:
--   admin@dedonnostyle.ch          / password123  (ADMIN)
--   user@dedonnostyle.ch           / password123  (USER)
--   platform-admin@docky.ch        / password123  (PLATFORM_ADMIN - see the
--     "Roles" bullet in CLAUDE.md: no self-service way to create one, this
--     is the "inserted by hand" path, just done here instead of via psql)
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
(company_id, client_id, supplier_id, is_primary, street, postal_code, city, country)
VALUES
(1, 1, NULL, TRUE, 'Rue de Lausanne 12', '1000', 'Lausanne', 'Suisse'),
(1, 2, NULL, TRUE, 'Route de Genève 5', '1007', 'Lausanne', 'Suisse'),
(1, 3, NULL, TRUE, 'Rue Centrale 18', '1020', 'Renens', 'Suisse'),
(1, 4, NULL, TRUE, 'Chemin du Bois 45', '1008', 'Prilly', 'Suisse'),
(1, 5, NULL, TRUE, 'Avenue des Alpes 9', '1800', 'Vevey', 'Suisse');

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

-- Projects 1 and 2 are COMPLETED: they exist because quotes OFF-2026-0001/
-- 0002 (below) were accepted, which is what actually creates a project now
-- (see document.service.ts's acceptQuoteServ) - a QUOTE itself can never
-- pick an existing project. Projects 3 and 4 are still IN_PROGRESS, created
-- by hand (project-form.ts), no quote yet.
INSERT INTO projects (company_id, client_id, project_type_id, name, same_address_as_client, street, postal_code, city, country, status)
VALUES
(1, 1, 1, 'Réparation de porte de cave', FALSE, 'Rue de la gare 2', '2500', 'Lausanne', 'Suisse', 'COMPLETED'),
(1, 1, 2, 'Création de cuisine sur mesure', FALSE, 'Rue de Génève 2', '3300', 'Geneve', 'Suisse', 'COMPLETED'),
(1, 2, 3, 'Réparation de meuble de salle de bain', TRUE, NULL, NULL, NULL, NULL, 'IN_PROGRESS'),
(1, 2, 4, 'Posage de l''isolation', TRUE, NULL, NULL, NULL, NULL, 'IN_PROGRESS');

-- ==========================================
-- SUPPLIERS
-- ==========================================

INSERT INTO suppliers
(company_id, supplier_code, name, category)
VALUES
(1, 'F001', 'Hornbach', 'Matériaux'),
(1, 'F002', 'Jumbo', 'Bricolage'),
(1, 'F003', 'Sanitas Troesch', 'Sanitaire');

INSERT INTO addresses
(company_id, client_id, supplier_id, is_primary, street, postal_code, city, country)
VALUES
(1, NULL, 1, TRUE, 'Route de Villeneuve 1', '1844', 'Villeneuve', 'Suisse'),
(1, NULL, 2, TRUE, 'Avenue de la Gare 10', '1023', 'Crissier', 'Suisse'),
(1, NULL, 3, TRUE, 'Chemin du Croset 20', '1023', 'Crissier', 'Suisse');

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
-- PROJECT RESOURCES
-- ==========================================

INSERT INTO project_resources
(company_id, project_id, resource_id, quantity, unit_price)
VALUES

-- Réparation de porte de cave: quantities/prices auto-derived from quote
-- OFF-2026-0001's own lines when it was accepted (see acceptQuoteServ) -
-- ciment adjusted up by hand afterwards (22 used on site vs. 20 quoted, the
-- "plus d'heures que prévu" case), maçon unchanged. Déplacement was added by
-- hand mid-chantier, not part of the original quote at all.
(1, 1, 1, 22, 15.00),
(1, 1, 5, 5, 95.00),
(1, 1, 8, 1, 60.00),

-- Création de cuisine sur mesure: matches quote OFF-2026-0002's lines
-- exactly, no adjustment needed on this one - already invoiced as
-- FAC-2026-0001.
(1, 2, 2, 300, 4.50),
(1, 2, 5, 6, 95.00),
(1, 2, 8, 1, 60.00),

-- Réparation de meuble de salle de bain: still IN_PROGRESS, no quote behind
-- it - linked by hand (tube PVC, maçon), nothing used on site yet (quantity
-- 0, same default linkResourceToProjectServ itself uses), priced at the
-- catalog's current price.
(1, 3, 3, 0, 22.00),
(1, 3, 5, 0, 95.00),

-- Posage de l'isolation: same idea (apprenti, location nacelle).
(1, 4, 6, 0, 55.00),
(1, 4, 9, 0, 250.00);

-- ==========================================
-- RESOURCE SUPPLIER PRICES
-- ==========================================

INSERT INTO resource_supplier_prices
(company_id, resource_id, supplier_id, purchase_price, discount, delivery_time, is_default)
VALUES
(1, 1, 1, 8.20, 5, 2, TRUE),
(1, 2, 1, 2.70, 3, 2, TRUE),
(1, 3, 2, 14.50, 0, 1, TRUE),
(1, 4, 2, 68.00, 10, 3, TRUE),
(1, 3, 3, 15.20, 5, 5, FALSE);

-- ==========================================
-- DOCUMENTS
-- ==========================================

-- amount_excl_vat/amount_incl_vat below match what the app itself would compute
-- from the lines further down (sum of each line's own total, then the document's
-- own discount% applied on top — see recomputeDocumentTotalsServ). amount_incl_vat
-- equals amount_excl_vat since no VAT rate is modelled anywhere yet. Kept in sync
-- by hand here since this file bypasses the API — if you change a line below,
-- update the matching document's amounts too.
-- Quotes never carry a project_id at creation (see document.service.ts's
-- addDocumentServ) - the two below already have one because they're
-- ACCEPTED, which is what created projects 1/2 in the first place. Invoices
-- FAC-2026-0001/0002 point to those same (now COMPLETED) projects.
INSERT INTO documents
(company_id, client_id, project_id, parent_document_id, type, number, date, amount_excl_vat, amount_incl_vat, discount, status, introduction, conclusion)
VALUES
(1, 1, 1, NULL, 'QUOTE', 'OFF-2026-0001', '2026-07-10', 775.00, 775.00, 0, 'ACCEPTED', NULL, NULL),
(1, 3, 2, NULL, 'QUOTE', 'OFF-2026-0002', '2026-07-11', 1881.00, 1881.00, 5, 'ACCEPTED', NULL, NULL),
(1, 3, 2, 2, 'INVOICE', 'FAC-2026-0001', '2026-07-15', 1881.00, 1881.00, 5, 'PAID',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.'),
(1, 1, 1, 1, 'INVOICE', 'FAC-2026-0002', '2026-08-05', 865.00, 865.00, 0, 'SENT',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.');

-- ==========================================
-- DOCUMENT SECTIONS
-- ==========================================

-- One section per document for now (ids 1/2/3/4, in insertion order below) -
-- document_lines references these by id further down.
INSERT INTO document_sections
(company_id, document_id, position, title)
VALUES
(1, 1, 1, 'Travaux'),
(1, 2, 1, 'Travaux'),
(1, 3, 1, 'Travaux'),
(1, 4, 1, 'Travaux');

-- ==========================================
-- DOCUMENT LINES
-- ==========================================

-- resource_id links each line to the catalog resource it was added from
-- (see acceptQuoteServ) - matches resources' insertion order above (1 Sac
-- ciment, 2 Parpaing, 5 Maçon qualifié, 8 Déplacement).
INSERT INTO document_lines
(company_id, document_id, section_id, type, position, label, quantity, unit, unit_price, discount, resource_id)
VALUES

-- Quote 1 (775.00) - section "Travaux" (id 1)
(1, 1, 1, 'MATERIAL', 1, 'Sac ciment 25kg', 20, 'Sac', 15, 0, 1),
(1, 1, 1, 'SERVICE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0, 5),

-- Quote 2 (1980 - 5% = 1881.00) - section "Travaux" (id 2)
(1, 2, 2, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0, 2),
(1, 2, 2, 'SERVICE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0, 5),
(1, 2, 2, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 8),

-- Invoice issued from quote 2 / project 2 (same lines, same total) - section "Travaux" (id 3)
(1, 3, 3, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0, 2),
(1, 3, 3, 'SERVICE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0, 5),
(1, 3, 3, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 8),

-- Invoice issued from project 1 once completed (865.00) - section "Travaux"
-- (id 4). Real quantities used on site (see project_resources), not the
-- original quote's (20 sacs, no déplacement).
(1, 4, 4, 'MATERIAL', 1, 'Sac ciment 25kg', 22, 'Sac', 15, 0, 1),
(1, 4, 4, 'SERVICE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0, 5),
(1, 4, 4, 'SERVICE', 3, 'Déplacement', 1, 'Forfait', 60, 0, 8);

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
