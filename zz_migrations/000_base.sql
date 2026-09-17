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
    logo VARCHAR(255),
    header_image VARCHAR(255)
);

-- ==========================================
-- USERS
-- ==========================================

CREATE TABLE users (
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

-- token_hash is a SHA-256 hash, never the raw token; revoked_at/expires_at
-- let a token be revoked (logout) independently of the JWT's own expiry.
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
-- LOGIN HISTORY
-- ==========================================

-- One row per login attempt (successful or not) - see auth.service.ts's
-- authUserService. user_id is nullable: an attempt against an unknown email
-- never resolves to a user, but email (what was actually typed) is kept
-- either way so a PLATFORM_ADMIN can still see it was tried. Deliberately
-- not scoped to a company - a PLATFORM_ADMIN is the only one who can read
-- this (see login_history.routes.ts), and oversees the whole SaaS.
CREATE TABLE login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    email VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
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
-- ADDRESSES
-- ==========================================

-- Client-owned only (suppliers removed) - documents.address_id picks one.
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    attention VARCHAR(100),
    street VARCHAR(100),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100),

    FOREIGN KEY (company_id)
        REFERENCES companies(id),
    FOREIGN KEY (client_id)
        REFERENCES clients(id)
);

-- At most one "primary" address per client.
CREATE UNIQUE INDEX addresses_one_primary_per_client
    ON addresses (client_id) WHERE is_primary = TRUE;

-- ==========================================
-- RESOURCES
-- ==========================================

CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    parent_resource_id INTEGER, -- for composite resources
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('MATERIAL', 'SERVICE')),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    selling_price NUMERIC(10,2) NOT NULL,
    purchase_price  NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,

    -- Scoped to the company, not table-wide - two different companies'
    -- catalogs are independent, there's no reason company 2 owning "MAT001"
    -- should block company 1 from using it too.
    UNIQUE (company_id, code),

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);

-- ==========================================
-- DOCUMENTS
-- ==========================================

-- type PROJECT is the chantier itself - its document_sections/document_lines
-- are its resource ledger, grouped into sections.
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    address_id INTEGER, -- which of the client's addresses; falls back to primary if unset
    reference_client VARCHAR(100), -- client's own reference/PO number, optional
    parent_document_id INTEGER,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('QUOTE', 'INVOICE', 'PROJECT')),
    -- Scoped unique per company below, not globally - generated in the service layer.
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
    FOREIGN KEY (address_id)
        REFERENCES addresses(id),
    FOREIGN KEY (parent_document_id)
        REFERENCES documents(id),
    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);


-- ==========================================
-- DOCUMENT SECTIONS
-- ==========================================

-- Groups document_lines under a title (e.g. "Gros oeuvre", "Finitions").
CREATE TABLE document_sections (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date_start TIMESTAMP, -- optional schedule for this section's work
    date_end TIMESTAMP,
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
    type VARCHAR(20) NOT NULL, -- MATERIAL/SERVICE, both priced via quantity+unit
    position INTEGER NOT NULL, -- position within its section, not the whole document
    label VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit VARCHAR(50),
    unit_price NUMERIC(10,2) NOT NULL,
    discount NUMERIC(5,2) DEFAULT 0,
    resource_id INTEGER, -- catalog resource this line came from, if any (null = hand-typed)
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (document_id)
        REFERENCES documents(id)
        ON DELETE CASCADE,

    FOREIGN KEY (section_id)
        REFERENCES document_sections(id)
        ON DELETE CASCADE,

    FOREIGN KEY (resource_id)
        REFERENCES resources(id),

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);

-- ==========================================
-- DOCUMENT TEMPLATES
-- ==========================================

-- Default introduction/conclusion per document type, applied client-side.
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

-- ==========================================
-- PROJECT
-- ==========================================

CREATE TABLE project_types (
    id SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL UNIQUE
);

-- Backed 1:1 by a PROJECT document (document_id) - its sections/lines are
-- this project's resource ledger. This table just holds the rest: identity/lifecycle.
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL UNIQUE,
    client_id INTEGER,
    project_type_id INTEGER,
    name VARCHAR(255) NOT NULL,
    note TEXT,
    -- Work lifecycle, separate from is_active (archiving) - COMPLETED unlocks invoicing.
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (document_id)
        REFERENCES documents(id),
    FOREIGN KEY (client_id)
        REFERENCES clients(id),
    FOREIGN KEY (project_type_id)
        REFERENCES project_types(id)
);

-- ==========================================
-- PROJECT ATTACHMENTS
-- ==========================================

-- Files attached to a project, stored in MinIO/S3 - no storage_key, the key
-- is derived from company_id/project_id/id/filename.
CREATE TABLE project_attachments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    uploaded_by INTEGER,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE SET NULL,
    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);
