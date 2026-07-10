-- ==========================================
-- CLIENTS
-- ==========================================

INSERT INTO clients
(num_client, societe, tva, nom, prenom, civilite, email, telephone, remarque)
VALUES
('C0001', NULL, NULL, 'Dupont', 'Jean', 'Monsieur', 'jean.dupont@gmail.com', '0791112233', NULL),
('C0002', NULL, NULL, 'Martin', 'Sophie', 'Madame', 'sophie.martin@gmail.com', '0792223344', NULL),
('C0003', 'Entreprise Martin SA', 'CHE-123.456.789', NULL, NULL, NULL, 'contact@martinsa.ch', '0211112233', 'Client professionnel'),
('C0004', 'ABC Construction SA', 'CHE-987.654.321', NULL, NULL, NULL, 'info@abcconstruction.ch', '0215556677', NULL),
('C0005', NULL, NULL, 'Durand', 'Paul', 'Monsieur', 'paul.durand@gmail.com', '0783334455', NULL);

-- ==========================================
-- ADRESSES
-- ==========================================

INSERT INTO adresses
(id_client, rue, npa, ville, pays)
VALUES
(1, 'Rue de Lausanne 12', 1000, 'Lausanne', 'Suisse'),
(2, 'Route de Genève 5', 1007, 'Lausanne', 'Suisse'),
(3, 'Rue Centrale 18', 1020, 'Renens', 'Suisse'),
(4, 'Chemin du Bois 45', 1008, 'Prilly', 'Suisse'),
(5, 'Avenue des Alpes 9', 1800, 'Vevey', 'Suisse');

-- ==========================================
-- FOURNISSEURS
-- ==========================================

INSERT INTO fournisseurs
(code_fournisseur, societe, adresse, categorie)
VALUES
('F001','Hornbach','Villeneuve','Matériaux'),
('F002','Jumbo','Crissier','Bricolage'),
('F003','Sanitas Troesch','Crissier','Sanitaire');

-- ==========================================
-- RESSOURCES
-- ==========================================

INSERT INTO ressources
(id_ressources, type, code, designation, unite, prix_vente, prix_achat)
VALUES
(NULL,'MATERIEL','MAT001','Sac ciment 25kg','Sac',15.00,8.50),
(NULL,'MATERIEL','MAT002','Parpaing 20 cm','Pièce',4.50,2.80),
(NULL,'MATERIEL','MAT003','Tube PVC Ø100','m',22.00,15.00),
(NULL,'MATERIEL','MAT004','Peinture blanche 10L','Pot',95.00,70.00),

(NULL,'MAIN-OEUVRE','MO001','Maçon qualifié','Heure',95.00,NULL),
(NULL,'MAIN-OEUVRE','MO002','Apprenti','Heure',55.00,NULL),

(NULL,'SOUS-TRAITANCE','ST001','Electricien externe','Heure',120.00,90.00),

(NULL,'DIVERS','DIV001','Déplacement','Forfait',60.00,NULL),
(NULL,'DIVERS','DIV002','Location nacelle','Jour',250.00,180.00);

-- ==========================================
-- TARIFS FOURNISSEURS
-- ==========================================

INSERT INTO ressources_tarifs_fournisseurs
(id_ressource,id_fournisseur,prix_achat,rabais,delai_livraison,defaut)
VALUES
(1,1,8.20,5,2,TRUE),
(2,1,2.70,3,2,TRUE),
(3,2,14.50,0,1,TRUE),
(4,2,68.00,10,3,TRUE),
(3,3,15.20,5,5,FALSE);

-- ==========================================
-- DOCUMENTS
-- ==========================================

INSERT INTO documents
(id_client,id_document_parent,type,numero,date,montant_ht,montant_ttc,rabais,statut)
VALUES
(1,NULL,'OFFRE','OFF-2026-0001','2026-07-10',650.00,702.65,0,'EN_ATTENTE'),

(3,NULL,'OFFRE','OFF-2026-0002','2026-07-11',2100.00,2269.20,5,'ACCEPTEE'),

(3,2,'FACTURE','FAC-2026-0001','2026-07-15',2100.00,2269.20,5,'PAYEE');

-- ==========================================
-- LIGNES DOCUMENT
-- ==========================================

INSERT INTO document_lignes
(id_document,type,pos,libelle,quantite,unite,prix_unitaire,rabais)
VALUES

-- Offre 1
(1,'MATERIEL',1,'Sac ciment 25kg',20,'Sac',15,0),
(1,'MAIN-OEUVRE',2,'Maçon qualifié',5,'Heure',95,0),

-- Offre 2
(2,'MATERIEL',1,'Parpaing 20 cm',300,'Pièce',4.50,0),
(2,'MAIN-OEUVRE',2,'Maçon qualifié',6,'Heure',95,0),
(2,'DIVERS',3,'Déplacement',1,'Forfait',60,0),

-- Facture issue de l'offre 2
(3,'MATERIEL',1,'Parpaing 20 cm',300,'Pièce',4.50,0),
(3,'MAIN-OEUVRE',2,'Maçon qualifié',6,'Heure',95,0),
(3,'DIVERS',3,'Déplacement',1,'Forfait',60,0);