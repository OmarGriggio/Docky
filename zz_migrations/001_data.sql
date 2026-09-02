INSERT INTO entreprises
(nom_entreprise, email, telephone, iban, rue, npa, ville, pays, logo)
VALUES
('DE DONNO STYLE Sàrl', 'dedonnostyle@gmail.com', '+41799549936', 'CH8500790016247615012', 'Rue de boujean 37', '2502', 'Biel/Bienne', 'Suisse', NULL);

-- ==========================================
-- UTILISATEURS
-- ==========================================

-- Dev seed login: admin@dedonnostyle.ch / password123
INSERT INTO utilisateurs
(id_entreprise, role, nom, prenom, email, motdepasse_hash)
VALUES
(1, 'ADMIN', 'Griggio', 'Omar', 'admin@dedonnostyle.ch', '$2b$10$iajz9XismG1lmi4UqoUE/eWKmkUbcCP0atCdq69lLJeyzLUYgxzEK');

-- ==========================================
-- CLIENTS
-- ==========================================

INSERT INTO clients
(id_entreprise, num_client, type, societe, tva, nom, prenom, civilite, email, telephone, remarque)
VALUES
(1, 'C0001', 'PARTICULIER', NULL, NULL, 'Dupont', 'Jean', 'Monsieur', 'jean.dupont@gmail.com', '0791112233', NULL),
(1, 'C0002', 'PARTICULIER', NULL, NULL, 'Martin', 'Sophie', 'Madame', 'sophie.martin@gmail.com', '0792223344', NULL),
(1, 'C0003', 'PROFESSIONNEL', 'Entreprise Martin SA', 'CHE-123.456.789', NULL, NULL, 'Madame, Monsieur,', 'contact@martinsa.ch', '0211112233', 'Client professionnel'),
(1, 'C0004', 'PROFESSIONNEL', 'ABC Construction SA', 'CHE-987.654.321', NULL, NULL, 'Madame, Monsieur', 'info@abcconstruction.ch', '0215556677', NULL),
(1, 'C0005', 'PARTICULIER', NULL, NULL, 'Durand', 'Paul', 'Monsieur', 'paul.durand@gmail.com', '0783334455', NULL);

-- ==========================================
-- ADRESSES
-- ==========================================

-- One per client here, so each is its client's only (and therefore "principale") address.
INSERT INTO adresses
(id_entreprise, id_client, id_fournisseur, principale, rue, npa, ville, pays)
VALUES
(1, 1, NULL, TRUE, 'Rue de Lausanne 12', '1000', 'Lausanne', 'Suisse'),
(1, 2, NULL, TRUE, 'Route de Genève 5', '1007', 'Lausanne', 'Suisse'),
(1, 3, NULL, TRUE, 'Rue Centrale 18', '1020', 'Renens', 'Suisse'),
(1, 4, NULL, TRUE, 'Chemin du Bois 45', '1008', 'Prilly', 'Suisse'),
(1, 5, NULL, TRUE, 'Avenue des Alpes 9', '1800', 'Vevey', 'Suisse');

-- ==========================================
-- CHANTIER
-- ==========================================

INSERT INTO types_chantier (libelle)
VALUES
('Porte'),
('Cuisines'),
('Salle de bain'),
('Réparation'),
('Isolation'),
('Autre');

INSERT INTO chantiers (id_entreprise, id_client, id_type_chantier, nom, adresse_identique_client, rue, npa, ville, pays)
VALUES
(1, 1, 1, 'Réparation de porte de cave', FALSE, 'Rue de la gare 2', '2500', 'Lausanne', 'Suisse'),
(1, 1, 2, 'Création de cuisine sur mesure', FALSE, 'Rue de Génève 2', '3300', 'Geneve', 'Suisse'),
(1, 2, 3, 'Réparation de meuble de salle de bain', TRUE, NULL, NULL, NULL, NULL),
(1, 2, 4, 'Posage de l''isolation', TRUE, NULL, NULL, NULL, NULL);

-- ==========================================
-- FOURNISSEURS
-- ==========================================

INSERT INTO fournisseurs
(id_entreprise, code_fournisseur, societe, categorie)
VALUES
(1, 'F001', 'Hornbach', 'Matériaux'),
(1, 'F002', 'Jumbo', 'Bricolage'),
(1, 'F003', 'Sanitas Troesch', 'Sanitaire');

INSERT INTO adresses
(id_entreprise, id_client, id_fournisseur, principale, rue, npa, ville, pays)
VALUES
(1, NULL, 1, TRUE, 'Route de Villeneuve 1', '1844', 'Villeneuve', 'Suisse'),
(1, NULL, 2, TRUE, 'Avenue de la Gare 10', '1023', 'Crissier', 'Suisse'),
(1, NULL, 3, TRUE, 'Chemin du Croset 20', '1023', 'Crissier', 'Suisse');

-- ==========================================
-- RESSOURCES
-- ==========================================

INSERT INTO ressources
(id_entreprise, id_ressources, type, code, designation, unite, prix_vente, prix_achat)
VALUES
(1, NULL, 'MATERIEL', 'MAT001', 'Sac ciment 25kg', 'Sac', 15.00, 8.50),
(1, NULL, 'MATERIEL', 'MAT002', 'Parpaing 20 cm', 'Pièce', 4.50, 2.80),
(1, NULL, 'MATERIEL', 'MAT003', 'Tube PVC Ø100', 'm', 22.00, 15.00),
(1, NULL, 'MATERIEL', 'MAT004', 'Peinture blanche 10L', 'Pot', 95.00, 70.00),

(1, NULL, 'MAIN-OEUVRE', 'MO001', 'Maçon qualifié', 'Heure', 95.00, NULL),
(1, NULL, 'MAIN-OEUVRE', 'MO002', 'Apprenti', 'Heure', 55.00, NULL),

(1, NULL, 'SOUS-TRAITANCE', 'ST001', 'Electricien externe', 'Heure', 120.00, 90.00),

(1, NULL, 'DIVERS', 'DIV001', 'Déplacement', 'Forfait', 60.00, NULL),
(1, NULL, 'DIVERS', 'DIV002', 'Location nacelle', 'Jour', 250.00, 180.00);

-- ==========================================
-- TARIFS FOURNISSEURS
-- ==========================================

INSERT INTO ressources_tarifs_fournisseurs
(id_entreprise, id_ressource, id_fournisseur, prix_achat, rabais, delai_livraison, defaut)
VALUES
(1, 1, 1, 8.20, 5, 2, TRUE),
(1, 2, 1, 2.70, 3, 2, TRUE),
(1, 3, 2, 14.50, 0, 1, TRUE),
(1, 4, 2, 68.00, 10, 3, TRUE),
(1, 3, 3, 15.20, 5, 5, FALSE);

-- ==========================================
-- DOCUMENTS
-- ==========================================

-- montant_ht/montant_ttc below match what the app itself would compute from
-- the lignes further down (sum of each ligne's own total, then the document's
-- own rabais% applied on top — see recomputeDocumentTotalsServ). montant_ttc
-- equals montant_ht since no VAT rate is modelled anywhere yet. Kept in sync
-- by hand here since this file bypasses the API — if you change a ligne
-- below, update the matching document's totals too.
INSERT INTO documents
(id_entreprise, id_client, id_chantier, id_document_parent, type, numero, date, montant_ht, montant_ttc, rabais, statut, introduction, conclusion)
VALUES
(1, 1, 1, NULL, 'OFFRE', 'OFF-2026-0001', '2026-07-10', 775.00, 775.00, 0, 'ENVOYE', NULL, NULL),
(1, 3, NULL, NULL, 'OFFRE', 'OFF-2026-0002', '2026-07-11', 1881.00, 1881.00, 5, 'ACCEPTE', NULL, NULL),
(1, 3, NULL, 2, 'FACTURE', 'FAC-2026-0001', '2026-07-15', 1881.00, 1881.00, 5, 'PAYE',
	'Nous avons le plaisir de vous soumettre la facture suivante.',
	'Nous vous remercions de votre confiance et restons à votre disposition pour toute information complémentaire.

	Avec nos meilleures salutations.');

-- ==========================================
-- LIGNES DOCUMENT
-- ==========================================

INSERT INTO document_lignes
(id_entreprise, id_document, type, pos, libelle, quantite, unite, prix_unitaire, rabais)
VALUES

-- Offre 1 (775.00)
(1, 1, 'MATERIEL', 1, 'Sac ciment 25kg', 20, 'Sac', 15, 0),
(1, 1, 'MAIN-OEUVRE', 2, 'Maçon qualifié', 5, 'Heure', 95, 0),

-- Offre 2 (1980 - 5% = 1881.00)
(1, 2, 'MATERIEL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0),
(1, 2, 'MAIN-OEUVRE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0),
(1, 2, 'DIVERS', 3, 'Déplacement', 1, 'Forfait', 60, 0),

-- Facture issue de l'offre 2 (mêmes lignes, même total)
(1, 3, 'MATERIEL', 1, 'Parpaing 20 cm', 300, 'Pièce', 4.50, 0),
(1, 3, 'MAIN-OEUVRE', 2, 'Maçon qualifié', 6, 'Heure', 95, 0),
(1, 3, 'DIVERS', 3, 'Déplacement', 1, 'Forfait', 60, 0);
