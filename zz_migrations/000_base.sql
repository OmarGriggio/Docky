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
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    password_hash text COLLATE pg_catalog."default" UNIQUE NOT NULL,
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
        CHECK (type IN ('MATERIAL', 'LABOR', 'SUBCONTRACTING', 'OTHER')),
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
-- DOCUMENT LINES
-- ==========================================

CREATE TABLE document_lines (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    -- 'MATERIAL' | 'SERVICE' are priced lines. 'SECTION' (a grouping title)
    -- and 'NOTE' (free text) are presentation-only: quantity/unit_price stay
    -- NULL for them, and they're skipped by computeDocumentTotals. There's
    -- no section_id/hierarchy - a SECTION line just visually groups every
    -- line after it (in `position` order) up to the next SECTION line.
    type VARCHAR(20) NOT NULL,
    position INTEGER NOT NULL,
    label VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,2),
    unit VARCHAR(50),
    unit_price NUMERIC(10,2),
    discount NUMERIC(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (document_id)
        REFERENCES documents(id)
        ON DELETE CASCADE,

    FOREIGN KEY (company_id)
        REFERENCES companies(id)
);
