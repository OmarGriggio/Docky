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

CREATE TABLE materiels (
    id SERIAL PRIMARY KEY,
    ref_materiel VARCHAR(50) UNIQUE,
    libelle VARCHAR(255),
    unite VARCHAR(50)
);

-- ==========================================
-- TARIFS MATERIEL
-- ==========================================

CREATE TABLE materiel_tarifs (
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
        REFERENCES materiels(id)
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
-- SERVICES
-- ==========================================

CREATE TABLE services (
    id SERIAL PRIMARY KEY,

    code VARCHAR(50) UNIQUE,

    libelle VARCHAR(255) NOT NULL,

    unite VARCHAR(50) NOT NULL,

    tarif NUMERIC(10,2) NOT NULL
);

-- ==========================================
-- DOCUMENTS
-- ==========================================

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,

    id_client INTEGER NOT NULL,

    type VARCHAR(20) NOT NULL,
    numero VARCHAR(50) UNIQUE NOT NULL,

    date DATE NOT NULL,

    montant_ht NUMERIC(12,2) DEFAULT 0,
    montant_ttc NUMERIC(12,2) DEFAULT 0,

    rabais NUMERIC(5,2) DEFAULT 0,

    statut VARCHAR(50),

    FOREIGN KEY (id_client)
        REFERENCES clients(id)
);


-- ==========================================
-- LIGNES DOCUMENT
-- ==========================================

CREATE TABLE document_lignes (
    id SERIAL PRIMARY KEY,

    id_document INTEGER NOT NULL,

    pos INTEGER NOT NULL,

    type VARCHAR(20) NOT NULL,

    libelle VARCHAR(255) NOT NULL,

    quantite NUMERIC(10,2) NOT NULL,

    unite VARCHAR(50),

    prix_unitaire NUMERIC(10,2) NOT NULL,

    rabais NUMERIC(5,2) DEFAULT 0,

    id_tarifs_materiel INTEGER,

    id_service INTEGER,

    FOREIGN KEY (id_document)
        REFERENCES documents(id)
        ON DELETE CASCADE,

    FOREIGN KEY (id_tarifs_materiel)
        REFERENCES materiel_tarifs(id),

    FOREIGN KEY (id_service)
        REFERENCES services(id)
);