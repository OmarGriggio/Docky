DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- ==========================================
-- ENTREPRISES
-- ==========================================

CREATE TABLE entreprises (
    id SERIAL PRIMARY KEY,
    nom_entreprise VARCHAR(100),
    email VARCHAR(255),
    telephone VARCHAR(50),
    iban VARCHAR(22),
    rue VARCHAR(100),
    npa VARCHAR(20),
    ville VARCHAR(100),
    pays VARCHAR(100),
    logo VARCHAR(255)
);

-- ==========================================
-- UTILISATEURS
-- ==========================================

CREATE TABLE utilisateurs
(
    id SERIAL PRIMARY KEY,
    id_entreprise INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT ('UTILISATEUR')
        CHECK (role IN ('ADMIN', 'UTILISATEUR', 'ADMIN_PLATEFORME')),
    nom character varying(100) COLLATE pg_catalog."default",
    prenom character varying(100) COLLATE pg_catalog."default",
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    motdepasse_hash text COLLATE pg_catalog."default" UNIQUE NOT NULL,
    date_creat timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modif timestamp without time zone,
    date_derniere_connexion timestamp without time zone,
    actif BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (id_entreprise)
        REFERENCES entreprises(id)
);

-- ==========================================
-- CLIENTS
-- ==========================================

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    id_entreprise INTEGER NOT NULL,
    num_client VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('PARTICULIER', 'PROFESSIONNEL')),
    societe VARCHAR (100),
    tva VARCHAR(20),
    nom VARCHAR(100),
    prenom VARCHAR(100),
    civilite VARCHAR(100),
    email VARCHAR(255),
    telephone VARCHAR(50),
    remarque VARCHAR(3000),
    actif BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (id_entreprise)
        REFERENCES entreprises(id)
);

-- ==========================================
-- ADRESSE
-- ==========================================

CREATE TABLE adresses (
    id SERIAL PRIMARY KEY,
    id_entreprise INTEGER NOT NULL,
    id_client INTEGER,
    rue VARCHAR(100),
    npa VARCHAR(20),
    ville VARCHAR(100),
    pays VARCHAR(100),

    FOREIGN KEY (id_entreprise)
        REFERENCES entreprises(id)
);

-- ==========================================
-- CHANTIER
-- ==========================================

CREATE TABLE types_chantier (
    id SERIAL PRIMARY KEY,
    libelle VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE chantiers (
    id SERIAL PRIMARY KEY,
    id_entreprise INTEGER NOT NULL,
    id_client INTEGER,
    id_type_chantier INTEGER,
    nom VARCHAR(255) NOT NULL,
    remarque TEXT,
    adresse_identique_client BOOLEAN NOT NULL DEFAULT TRUE,
    rue VARCHAR(255),
    npa VARCHAR(20),
    ville VARCHAR(100),
    pays VARCHAR(100),
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actif BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (id_client)
        REFERENCES clients(id),
    FOREIGN KEY (id_type_chantier)
        REFERENCES types_chantier(id)
);

-- ==========================================
-- FOURNISSEURS
-- ==========================================

CREATE TABLE fournisseurs (
    id SERIAL PRIMARY KEY,
    id_entreprise INTEGER NOT NULL,
    code_fournisseur VARCHAR(50) UNIQUE,
    societe VARCHAR(255),
    adresse TEXT,
    categorie VARCHAR(100),
    actif BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (id_entreprise)
        REFERENCES entreprises(id)
);

-- ==========================================
-- RESSOURCES
-- ==========================================

CREATE TABLE ressources (
    id SERIAL PRIMARY KEY,
    id_entreprise INTEGER NOT NULL,
    id_ressources INTEGER, --Pour les ressources composés
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('MATERIEL', 'MAIN-OEUVRE', 'SOUS-TRAITANCE', 'DIVERS')),
    code VARCHAR(50) UNIQUE,
    designation VARCHAR(255) NOT NULL,
    unite VARCHAR(50) NOT NULL,
    prix_vente NUMERIC(10,2) NOT NULL,
    prix_achat  NUMERIC(10,2),
    actif BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (id_entreprise)
        REFERENCES entreprises(id)
);

-- ==========================================
-- TARIFS FOURNISSEURS MATERIEL
-- ==========================================

CREATE TABLE ressources_tarifs_fournisseurs (
    id SERIAL PRIMARY KEY,
    id_entreprise INTEGER NOT NULL,
    id_ressource INTEGER,
    id_fournisseur INTEGER,
    prix_achat NUMERIC(10,2),
    rabais NUMERIC(5,2),
    delai_livraison INTEGER,
    defaut BOOLEAN,

    FOREIGN KEY (id_ressource)
        REFERENCES ressources(id),

    FOREIGN KEY (id_fournisseur)
        REFERENCES fournisseurs(id),

    FOREIGN KEY (id_entreprise)
        REFERENCES entreprises(id)
);

-- ==========================================
-- DOCUMENTS
-- ==========================================

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    id_entreprise INTEGER NOT NULL,
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
    introduction TEXT,
    conclusion TEXT,
    actif BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (id_client)
        REFERENCES clients(id),
    FOREIGN KEY (id_document_parent)
        REFERENCES documents(id),
    FOREIGN KEY (id_entreprise)
        REFERENCES entreprises(id)
);


-- ==========================================
-- LIGNES DOCUMENT
-- ==========================================

CREATE TABLE document_lignes (
    id SERIAL PRIMARY KEY,
    id_entreprise INTEGER NOT NULL,
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
        ON DELETE CASCADE,

    FOREIGN KEY (id_entreprise)
        REFERENCES entreprises(id)
);