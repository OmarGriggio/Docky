-- ==========================================
-- FOURNISSEURS
-- ==========================================

CREATE TABLE fournisseurs (
    id SERIAL PRIMARY KEY,
    code_fournisseur VARCHAR(50) UNIQUE,
    societe VARCHAR(255),
    adresse TEXT,
    categorie VARCHAR(100)
);

-- ==========================================
-- MATERIEL
-- ==========================================

CREATE TABLE materiel (
    id SERIAL PRIMARY KEY,
    ref_materiel VARCHAR(50) UNIQUE,
    libelle VARCHAR(255),
    unite VARCHAR(50)
);

-- ==========================================
-- TARIFS MATERIEL
-- ==========================================

CREATE TABLE materiel_tarif (
    id SERIAL PRIMARY KEY,

    id_fournisseur INTEGER,
    id_materiel INTEGER,

    tarif NUMERIC(10,2),
    defaut BOOLEAN,
    rabais NUMERIC(5,2),
    delai_livraison INTEGER,

    FOREIGN KEY (id_fournisseur)
        REFERENCES fournisseurs(id),

    FOREIGN KEY (id_materiel)
        REFERENCES materiel(id)
);

-- ==========================================
-- CLIENTS
-- ==========================================

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    code_client VARCHAR(50) UNIQUE,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    societe VARCHAR(255),
    email VARCHAR(255),
    telephone VARCHAR(50)
);

-- ==========================================
-- CATEGORIES EMPLOYES
-- ==========================================

CREATE TABLE employes_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50),
    libelle VARCHAR(255),
    tarif_heure NUMERIC(10,2)
);

-- ==========================================
-- FACTURES
-- ==========================================

CREATE TABLE factures (
    id SERIAL PRIMARY KEY,

    id_client INTEGER,

    num_facture VARCHAR(50) UNIQUE,
    date DATE,

    montant_ht NUMERIC(12,2),
    montant_ttc NUMERIC(12,2),

    rabais NUMERIC(5,2),
    statut VARCHAR(50),

    FOREIGN KEY (id_client)
        REFERENCES clients(id)
);

-- ==========================================
-- LIGNES DE FACTURE
-- ==========================================

CREATE TABLE factures_lignes (
    id SERIAL PRIMARY KEY,

    id_facture INTEGER,
    id_tarifs_materiel INTEGER,
    id_employe_categorie INTEGER,

    pos INTEGER,

    ref_materiel VARCHAR(50),
    libelle_materiel VARCHAR(255),
    quantite_materiel NUMERIC(10,2),
    tarif_materiel NUMERIC(10,2),

    libelle_employe VARCHAR(255),
    temps_employe NUMERIC(10,2),
    tarif_employe NUMERIC(10,2),

    FOREIGN KEY (id_facture)
        REFERENCES factures(id),

    FOREIGN KEY (id_tarifs_materiel)
        REFERENCES materiel_tarif(id),

    FOREIGN KEY (id_employe_categorie)
        REFERENCES employes_categories(id)
);

-- ==========================================
-- OFFRES (DEVIS)
-- ==========================================

CREATE TABLE offres (
    id SERIAL PRIMARY KEY,

    id_client INTEGER,

    num_offre VARCHAR(50) UNIQUE,
    date DATE,

    montant_ht NUMERIC(12,2),
    montant_ttc NUMERIC(12,2),

    rabais NUMERIC(5,2),
    statut VARCHAR(50),

    FOREIGN KEY (id_client)
        REFERENCES clients(id)
);


-- ==========================================
-- OFFRES MATERIEL
-- ==========================================

CREATE TABLE offre_materiel (
    id SERIAL PRIMARY KEY,

    id_offre INTEGER,
    id_tarifs_materiel INTEGER,

    pos INTEGER,

    ref_materiel VARCHAR(50),
    libelle_materiel VARCHAR(255),

    quantite NUMERIC(10,2),
    tarif NUMERIC(10,2),

    rabais NUMERIC(5,2),

    FOREIGN KEY (id_offre)
        REFERENCES offres(id),

    FOREIGN KEY (id_tarifs_materiel)
        REFERENCES materiel_tarif(id)
);


-- ==========================================
-- OFFRES SERVICES
-- ==========================================

CREATE TABLE offre_service (
    id SERIAL PRIMARY KEY,

    id_offre INTEGER,
    id_employe_categorie INTEGER,

    pos INTEGER,

    libelle_service VARCHAR(255),

    quantite NUMERIC(10,2),
    unite VARCHAR(50),

    tarif NUMERIC(10,2),

    rabais NUMERIC(5,2),

    FOREIGN KEY (id_offre)
        REFERENCES offres(id),

    FOREIGN KEY (id_employe_categorie)
        REFERENCES employes_categories(id)
);

