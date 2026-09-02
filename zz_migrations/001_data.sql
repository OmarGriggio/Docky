INSERT INTO companies
(name, email, phone, iban, street, postal_code, city, country, logo)
VALUES
('DE DONNO STYLE Sàrl', 'dedonnostyle@gmail.com', '+41799549936', 'CH8500790016247615012', 'Rue de boujean 37', '2502', 'Biel/Bienne', 'Suisse', NULL);

-- ==========================================
-- USERS
-- ==========================================

-- Dev seed login: admin@dedonnostyle.ch / password123
INSERT INTO users
(company_id, role, last_name, first_name, email, password_hash)
VALUES
(1, 'ADMIN', 'Griggio', 'Omar', 'admin@dedonnostyle.ch', '$2b$10$iajz9XismG1lmi4UqoUE/eWKmkUbcCP0atCdq69lLJeyzLUYgxzEK');

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

INSERT INTO projects (company_id, client_id, project_type_id, name, same_address_as_client, street, postal_code, city, country)
VALUES
(1, 1, 1, 'Réparation de porte de cave', FALSE, 'Rue de la gare 2', '2500', 'Lausanne', 'Suisse'),
(1, 1, 2, 'Création de cuisine sur mesure', FALSE, 'Rue de Génève 2', '3300', 'Geneve', 'Suisse'),
(1, 2, 3, 'Réparation de meuble de salle de bain', TRUE, NULL, NULL, NULL, NULL),
(1, 2, 4, 'Posage de l''isolation', TRUE, NULL, NULL, NULL, NULL);

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

(1, NULL, 'LABOR', 'MO001', 'Maçon qualifié', 'Heure', 95.00, NULL),
(1, NULL, 'LABOR', 'MO002', 'Apprenti', 'Heure', 55.00, NULL),

(1, NULL, 'SUBCONTRACTING', 'ST001', 'Electricien externe', 'Heure', 120.00, 90.00),

(1, NULL, 'OTHER', 'DIV001', 'Déplacement', 'Forfait', 60.00, NULL),
(1, NULL, 'OTHER', 'DIV002', 'Location nacelle', 'Jour', 250.00, 180.00);

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
INSERT INTO documents
(company_id, client_id, project_id, parent_document_id, type, number, date, amount_excl_vat, amount_incl_vat, discount, status, introduction, conclusion)
VALUES
(1, 1, 1, NULL, 'QUOTE', 'OFF-2026-0001', '2026-07-10', 775.00, 775.00, 0, 'SENT', NULL, NULL),
(1, 3, NULL, NULL, 'QUOTE', 'OFF-2026-0002', '2026-07-11', 1881.00, 1881.00, 5, 'ACCEPTED', NULL, NULL),
(1, 3, NULL, 2, 'INVOICE', 'FAC-2026-0001', '2026-07-15', 1881.00, 1881.00, 5, 'PAID',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.');

-- ==========================================
-- DOCUMENT LINES
-- ==========================================

INSERT INTO document_lines
(company_id, document_id, type, position, label, quantity, unit, unit_price, discount)
VALUES

-- Quote 1 (775.00)
(1, 1, 'MATERIAL', 1, 'Sac ciment 25kg', 20, 'Sac', 15, 0),
(1, 1, 'LABOR', 2, 'Maçon qualifié', 5, 'Heure', 95, 0),

-- Quote 2 (1980 - 5% = 1881.00)
(1, 2, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0),
(1, 2, 'LABOR', 2, 'Maçon qualifié', 6, 'Heure', 95, 0),
(1, 2, 'OTHER', 3, 'Déplacement', 1, 'Forfait', 60, 0),

-- Invoice issued from quote 2 (same lines, same total)
(1, 3, 'MATERIAL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0),
(1, 3, 'LABOR', 2, 'Maçon qualifié', 6, 'Heure', 95, 0),
(1, 3, 'OTHER', 3, 'Déplacement', 1, 'Forfait', 60, 0);
