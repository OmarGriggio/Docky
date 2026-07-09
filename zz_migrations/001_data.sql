-- ==========================================
-- FOURNISSEURS
-- ==========================================

INSERT INTO fournisseurs (code_fournisseur, societe, adresse, categorie)
VALUES
('FOUR001', 'Point P', 'Rue de l''Industrie 10, Lausanne', 'Matériaux'),
('FOUR002', 'Sanitas Troesch', 'Chemin des Artisans 5, Genève', 'Sanitaire');

-- ==========================================
-- CATALOGUE
-- ==========================================

INSERT INTO catalogue (type, code, libelle, unite, prix_vente)
VALUES 
('MATERIEL', 'MAT-0001', 'Cadre de porte 25x100', 'MM', 256.20),
('MATERIEL', 'MAT-0002', 'Liste en bois 40x50', 'MM', 54.20),
('SERVICE', 'SERV-0001', 'Découpage de fenetre', 'H', 150),
('SERVICE', 'SERV-0002', 'Ponsage etcetc', 'H', 150)

-- ==========================================
-- TARIFS MATERIEL
-- ==========================================

INSERT INTO materiel_tarifs (id_fournisseur, id_catalogue, prix_achat, defaut, rabais, delai_livraison)
VALUES
((select id from fournisseurs where code_fournisseur = 'FOUR001'), 
	(select id from catalogue where code = 'MAT-0001'), 5.20, TRUE, 0, 2),
((select id from fournisseurs where code_fournisseur = 'FOUR001'), 
	(select id from catalogue where code = 'MAT-0002'), 2.80, TRUE, 0, 2),
((select id from fournisseurs where code_fournisseur = 'FOUR002'), 
	(select id from catalogue where code = 'SERV-0001'), 129.90, TRUE, 10, 5);

-- ==========================================
-- CLIENTS
-- ==========================================

INSERT INTO clients (code_client, nom, prenom, societe, email, telephone)
VALUES
('CLI001', 'Dupont', 'Jean', 'Dupont Construction SA', 'jean.dupont@test.ch', '0211111111'),
('CLI002', 'Martin', 'Sophie', 'Martin SA', 'sophie.martin@test.ch', '0222222222');

-- ==========================================
-- DOCUMENTS
-- ==========================================

INSERT INTO documents (id_client, type, numero, date, montant_ht, montant_ttc, rabais, statut)
VALUES
(1, 'OFFRE', 'DEV2026001', '2026-07-09', 1070.00, 1156.70, 0, 'Envoyée'),
(1, 'FACTURE', 'FAC2026001', '2026-07-10', 320.90, 346.60, 0, 'Payée'),
(2, 'FACTURE', 'FAC2026002', '2026-07-11', 214.90, 232.10, 5, 'En attente');

-- ==========================================
-- LIGNES DOCUMENTS
-- ==========================================

-- Offre
INSERT INTO document_lignes
(id_document, pos, type, libelle, quantite, unite, prix_unitaire, rabais)
VALUES
(1, 1, 'MATERIEL', 'Tube PVC Ø40', 20, 'm', 5.20, 0),
(1, 2, 'MATERIEL', 'Coude PVC 90°', 10, 'pcs', 2.80, 0),
(1, 3, 'SERVICE', 'Installation plomberie', 10, 'heure', 85,0);

-- Facture 1
INSERT INTO document_lignes
(id_document, pos, type, libelle, quantite, unite, prix_unitaire, rabais)
VALUES
(2, 1, 'MATERIEL', 'Tube PVC Ø40', 12, 'm', 5.20, 0),
(2, 2, 'SERVICE', 'Installation plomberie', 3.5, 'heure', 85, 0);

-- Facture 2
INSERT INTO document_lignes
(id_document, pos, type, libelle, quantite, unite, prix_unitaire, rabais)
VALUES
(3, 1, 'MATERIEL', 'Robinet mélangeur', 1, 'pcs', 129.90, 0),
(3, 2, 'SERVICE', 'Chef de chantier', 0.75, 'heure', 120, 0);