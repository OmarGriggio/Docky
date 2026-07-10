

-- ==========================================
-- CLIENTS
-- ==========================================

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    num_client VARCHAR(50) UNIQUE,
    societe VARCHAR (100),
    tva VARCHAR(20),
    nom VARCHAR(100),
    prenom VARCHAR(100),
    civilite VARCHAR(100),
    email VARCHAR(255),
    telephone VARCHAR(50),
    remarque VARCHAR(3000)
);

-- ==========================================
-- ADRESSE
-- ==========================================

CREATE TABLE adresses (
    id SERIAL PRIMARY KEY,
    id_client INTEGER,
    rue VARCHAR(100),
    npa INTEGER,
    ville VARCHAR(100),
    pays VARCHAR(100)
);


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
-- RESSOURCES
-- ==========================================

CREATE TABLE ressources (
    id SERIAL PRIMARY KEY,
    id_ressources INTEGER, --Pour les ressources composés
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('MATERIEL', 'MAIN-OEUVRE', 'SOUS-TRAITANCE', 'DIVERS')),
    code VARCHAR(50) UNIQUE,
    designation VARCHAR(255) NOT NULL,
    unite VARCHAR(50) NOT NULL,
    prix_vente NUMERIC(10,2) NOT NULL,
    prix_achat  NUMERIC(10,2),
    actif BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- TARIFS FOURNISSEURS MATERIEL
-- ==========================================

CREATE TABLE ressources_tarifs_fournisseurs (
    id SERIAL PRIMARY KEY,
    id_ressource INTEGER,
    id_fournisseur INTEGER,
    prix_achat NUMERIC(10,2),
    rabais NUMERIC(5,2),
    delai_livraison INTEGER,
    defaut BOOLEAN,

    FOREIGN KEY (id_ressource)
        REFERENCES ressources(id),

    FOREIGN KEY (id_fournisseur)
        REFERENCES fournisseurs(id)
);

-- ==========================================
-- DOCUMENTS
-- ==========================================

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    id_client INTEGER NOT NULL,
    id_document_parent INTEGER,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('OFFRE', 'FACTURE')),
    numero VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    montant_ht NUMERIC(12,2) DEFAULT 0,
    montant_ttc NUMERIC(12,2) DEFAULT 0,
    rabais NUMERIC(5,2) DEFAULT 0,
    statut VARCHAR(50),

    FOREIGN KEY (id_client)
        REFERENCES clients(id),

    FOREIGN KEY (id_document_parent)
        REFERENCES documents(id)
);


-- ==========================================
-- LIGNES DOCUMENT
-- ==========================================

CREATE TABLE document_lignes (
    id SERIAL PRIMARY KEY,
    id_document INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    pos INTEGER NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    quantite NUMERIC(10,2) NOT NULL,
    unite VARCHAR(50),
    prix_unitaire NUMERIC(10,2) NOT NULL,
    rabais NUMERIC(5,2) DEFAULT 0,

    FOREIGN KEY (id_document)
        REFERENCES documents(id)
        ON DELETE CASCADE
);