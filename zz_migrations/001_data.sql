-- ==========================================
-- FOURNISSEURS
-- ==========================================

INSERT INTO fournisseurs (code_fournisseur, societe, adresse, categorie)
VALUES
('FOUR001', 'Point P', 'Rue de l''Industrie 10, Lausanne', 'Matériaux'),
('FOUR002', 'Sanitas Troesch', 'Chemin des Artisans 5, Genève', 'Sanitaire'),
('FOUR005','Matériaux SA','Rue des Artisans 10, Lausanne','Matériaux construction');

-- ==========================================
-- MATERIEL
-- ==========================================

INSERT INTO materiel (ref_materiel, libelle, unite)
VALUES
('MAT001', 'Tube PVC Ø40', 'm'),
('MAT002', 'Coude PVC 90°', 'pcs'),
('MAT003', 'Robinet mélangeur', 'pcs')
('MAT005','Tube PVC Ø40','mètre'),
('MAT006','Coude PVC Ø40','pièce');

-- ==========================================
-- TARIFS MATERIEL
-- ==========================================

INSERT INTO materiel_tarif
(id_fournisseur, id_materiel, tarif, defaut, rabais, delai_livraison)
VALUES
(1, 1, 5.20, TRUE, 5, 2),
(1, 2, 2.80, TRUE, 0, 2),
(2, 3, 129.90, TRUE, 10, 5),
(1,1,5.20,TRUE,0,2),
(1,2,3.50,TRUE,0,2);

-- ==========================================
-- CLIENTS
-- ==========================================

INSERT INTO clients
(code_client, nom, prenom, societe, email, telephone)
VALUES
('CLI001', 'Dupont', 'Jean', 'Dupont Immobilier', 'jean.dupont@test.ch', '0211111111'),
('CLI002', 'Martin', 'Sophie', 'Martin SA', 'sophie.martin@test.ch', '0222222222'),
('CLI005','Dupont','Jean','Dupont Construction SA','jean.dupont@dupont.ch','0215556677');

-- ==========================================
-- CATEGORIES EMPLOYES
-- ==========================================

INSERT INTO employes_categories
(code, libelle, tarif_heure)
VALUES
('APP', 'Apprenti', 45),
('OUV', 'Ouvrier qualifié', 85),
('CHEF', 'Chef de chantier', 120),
('PLOMB','Plombier',85);

-- ==========================================
-- FACTURES
-- ==========================================

INSERT INTO factures
(id_client, num_facture, date, montant_ht, montant_ttc, rabais, statut)
VALUES
(1, 'FAC2026001', '2026-07-06', 320.90, 346.60, 0, 'Payée'),
(2, 'FAC2026002', '2026-07-07', 214.90, 232.10, 5, 'En attente');

-- ==========================================
-- LIGNES DE FACTURE
-- ==========================================

INSERT INTO factures_lignes
(
id_facture,
id_tarifs_materiel,
id_employe_categorie,
pos,

ref_materiel,
libelle_materiel,
quantite_materiel,
tarif_materiel,

libelle_employe,
temps_employe,
tarif_employe
)
VALUES

-- Facture 1
(1,1,NULL,1,'MAT001','Tube PVC Ø40',12,5.20,NULL,NULL,NULL),
(1,NULL,2,2,NULL,NULL,NULL,NULL,'Ouvrier qualifié',3.5,85),

-- Facture 2
(2,3,NULL,1,'MAT003','Robinet mélangeur',1,129.90,NULL,NULL,NULL),
(2,NULL,3,2,NULL,NULL,NULL,NULL,'Chef de chantier',0.75,120);


-- ==========================================
-- OFFRE
-- ==========================================

INSERT INTO offres (
    id_client,
    num_offre,
    date,
    montant_ht,
    montant_ttc,
    rabais,
    statut
)
VALUES
(1,'DEV2026001','2026-07-09',1070.00,1156.70,0,'Envoyée');


-- ==========================================
-- OFFRE MATERIEL
-- ==========================================

INSERT INTO offre_materiel (
    id_offre,
    id_tarifs_materiel,
    pos,
    ref_materiel,
    libelle_materiel,
    quantite,
    tarif,
    rabais
)
VALUES
(1,1,1,'MAT001','Tube PVC Ø40',20,5.20,0),
(1,2,2,'MAT002','Coude PVC Ø40',10,3.50,0);


-- ==========================================
-- OFFRE SERVICE
-- ==========================================

INSERT INTO offre_service (
    id_offre,
    id_employe_categorie,
    pos,
    libelle_service,
    quantite,
    unite,
    tarif,
    rabais
)
VALUES
(1,1,3,'Installation plomberie',10,'heure',85,0);