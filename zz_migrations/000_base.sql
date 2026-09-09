DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- ==========================================
-- COMPANIES
-- ==========================================

CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    iban VARCHAR(22),
    street VARCHAR(100),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100),
    logo VARCHAR(255)
);

-- ==========================================
-- USERS
-- ==========================================

CREATE TABLE users
(
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT ('USER')
        CHECK (role IN ('ADMIN', 'USER', 'PLATFORM_ADMIN')),
    last_name character varying(100) COLLATE pg_catalog."default",
    first_name character varying(100) COLLATE pg_catalog."default",
    email character varying(255) COLLATE pg_catalog."default" UNIQUE NOT NULL,
    password_hash text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    last_login_at timestamp without time zone,
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);

-- ==========================================
-- REFRESH TOKENS
-- ==========================================

-- token_hash stores a SHA-256 hash of the refresh token, never the raw value,
-- so a database leak alone doesn't hand out valid tokens. revoked_at is set on
-- logout; expires_at is enforced on top of the JWT's own expiry so a revoked
-- or stale row is rejected even if the token's signature still checks out.
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
);

-- ==========================================
-- CLIENTS
-- ==========================================

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    client_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('INDIVIDUAL', 'PROFESSIONAL')),
    company_name VARCHAR (100),
    vat_number VARCHAR(20),
    last_name VARCHAR(100),
    first_name VARCHAR(100),
    title VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    note VARCHAR(3000),
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);

-- ==========================================
-- PROJECT
-- ==========================================

CREATE TABLE project_types (
    id SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    client_id INTEGER,
    project_type_id INTEGER,
    name VARCHAR(255) NOT NULL,
    note TEXT,
    same_address_as_client BOOLEAN NOT NULL DEFAULT TRUE,
    street VARCHAR(255),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (client_id)
        REFERENCES clients(id),
    FOREIGN KEY (project_type_id)
        REFERENCES project_types(id)
);

-- ==========================================
-- SUPPLIERS
-- ==========================================

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    supplier_code VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);

-- ==========================================
-- ADDRESSES
-- ==========================================

-- Belongs to exactly one of client / supplier, never both, never neither.
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    client_id INTEGER,
    supplier_id INTEGER,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    Attention VARCHAR(100),
    street VARCHAR(100),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100),

    FOREIGN KEY (company_id)
        REFERENCES companies(id),
    FOREIGN KEY (client_id)
        REFERENCES clients(id),
    FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id),
    CHECK ((client_id IS NOT NULL) <> (supplier_id IS NOT NULL))
);

-- At most one "primary" address per client, and per supplier.
CREATE UNIQUE INDEX addresses_one_primary_per_client
    ON addresses (client_id) WHERE is_primary = TRUE AND client_id IS NOT NULL;
CREATE UNIQUE INDEX addresses_one_primary_per_supplier
    ON addresses (supplier_id) WHERE is_primary = TRUE AND supplier_id IS NOT NULL;

-- ==========================================
-- RESOURCES
-- ==========================================

CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    parent_resource_id INTEGER, -- for composite resources
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('MATERIAL', 'SERVICE')),
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    selling_price NUMERIC(10,2) NOT NULL,
    purchase_price  NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);

-- ==========================================
-- PROJECT RESOURCES
-- ==========================================

-- Links a project ("chantier") to the resources (materials/services) it
-- uses - a plain many-to-many join, no quantity/price of its own yet. The
-- point: picking a project when creating a document can pre-fill its lines
-- from this association (not implemented yet - see the TODO in CLAUDE.md).
CREATE TABLE project_resources (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    resource_id INTEGER NOT NULL,

    UNIQUE (project_id, resource_id),

    FOREIGN KEY (project_id)
        REFERENCES projects(id),
    FOREIGN KEY (resource_id)
        REFERENCES resources(id),
    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);

-- ==========================================
-- RESOURCE SUPPLIER PRICES
-- ==========================================

CREATE TABLE resource_supplier_prices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    resource_id INTEGER,
    supplier_id INTEGER,
    purchase_price NUMERIC(10,2),
    discount NUMERIC(5,2),
    delivery_time INTEGER,
    is_default BOOLEAN,

    FOREIGN KEY (resource_id)
        REFERENCES resources(id),

    FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id),

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);

-- ==========================================
-- DOCUMENTS
-- ==========================================

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    project_id INTEGER,
    parent_document_id INTEGER,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('QUOTE', 'INVOICE')),
    -- Not UNIQUE on its own: two different companies can both have a
    -- number "INVOICE-2026-0001". Uniqueness is scoped per company below.
    -- The actual FAC_YYYY_00001/INV_YYYY_00001 generation happens in the
    -- service layer, not here - this column just has to be able to hold it.
    number VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    amount_excl_vat NUMERIC(12,2) DEFAULT 0,
    amount_incl_vat NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(5,2) DEFAULT 0,
    vat_rate NUMERIC(5,2) DEFAULT 0,
    status VARCHAR(50)
        CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'PAID', 'CANCELLED')),
    introduction TEXT,
    conclusion TEXT,
    payment_terms TEXT,
    due_date DATE,
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE (company_id, number),

    FOREIGN KEY (client_id)
        REFERENCES clients(id),
    FOREIGN KEY (project_id)
        REFERENCES projects(id),
    FOREIGN KEY (parent_document_id)
        REFERENCES documents(id),
    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);


-- ==========================================
-- DOCUMENT SECTIONS
-- ==========================================

-- A grouping title within a document (e.g. "Gros oeuvre", "Finitions") -
-- every document_lines row belongs to exactly one of these. Replaces the
-- earlier flat-list-with-a-SECTION-marker-line approach (see the "Flexible
-- document lines" entry in zz_docs/Decisions.md for that original decision
-- and why it was revisited).
CREATE TABLE document_sections (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (document_id)
        REFERENCES documents(id)
        ON DELETE CASCADE,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);

-- ==========================================
-- DOCUMENT LINES
-- ==========================================

CREATE TABLE document_lines (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    -- Both priced: MATERIAL uses quantity+unit for a physical amount (e.g.
    -- "20 Sac"), SERVICE uses quantity+unit for time (e.g. "5 Heure") - same
    -- two columns for both, no separate "hours" field.
    type VARCHAR(20) NOT NULL,
    -- Position within its section (not the whole document) - section
    -- ordering itself is document_sections.position.
    position INTEGER NOT NULL,
    label VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit VARCHAR(50),
    unit_price NUMERIC(10,2) NOT NULL,
    discount NUMERIC(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (document_id)
        REFERENCES documents(id)
        ON DELETE CASCADE,

    FOREIGN KEY (section_id)
        REFERENCES document_sections(id)
        ON DELETE CASCADE,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);

-- ==========================================
-- DOCUMENT TEMPLATES
-- ==========================================

-- Default introduction/conclusion text per document type (e.g. a standard
-- "Vous trouverez ci-dessous la facture..." for INVOICE) - at most one row
-- per (company_id, type), applied client-side when that type is picked on a
-- new document (see document-form.ts/document-form-v2.ts), never touched
-- server-side otherwise.
CREATE TABLE document_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('QUOTE', 'INVOICE')),
    introduction TEXT,
    conclusion TEXT,

    UNIQUE (company_id, type),

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);
