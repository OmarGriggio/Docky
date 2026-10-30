-- Error tracking, kept on our own server (see backend/src/modules/error-log):
-- every unexpected error - a 500 from the backend, an error a user's browser
-- ran into - lands here, grouped. One row per distinct error (its
-- fingerprint: where it happened and what it says), not per occurrence: the
-- same bug hit 200 times is one row with occurrences = 200, so the table
-- stays small and a PLATFORM_ADMIN reads a list of bugs, not a flood.
--
-- resolved_at: set by hand once fixed, cleared again if the same error comes
-- back (a regression shows up as open again).
--
-- last_company_id/last_user_id: who ran into it last, to reproduce it -
-- kept if that user/company goes away, just unlinked (SET NULL), same as
-- login_history. No request body, header or other personal data is stored.

CREATE TABLE IF NOT EXISTS error_groups (
    id SERIAL PRIMARY KEY,
    fingerprint VARCHAR(64) NOT NULL UNIQUE,
    source VARCHAR(20) NOT NULL CHECK (source IN ('BACKEND', 'FRONTEND')),
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    stack TEXT,
    location VARCHAR(500),
    occurrences INTEGER NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    last_company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    last_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS error_groups_last_seen_at_idx ON error_groups (last_seen_at DESC);
