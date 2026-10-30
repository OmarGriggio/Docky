export type ErrorSource = "BACKEND" | "FRONTEND";

// One distinct error (see 011_add_error_groups.sql) - every occurrence of
// the same one only bumps occurrences/last_seen_at.
export interface ErrorGroup {
  id: number;
  fingerprint: string;
  source: ErrorSource;
  name: string;
  message: string;
  stack: string | null;
  location: string | null;
  occurrences: number;
  first_seen_at: Date;
  last_seen_at: Date;
  resolved_at: Date | null;
  last_company_id: number | null;
  last_user_id: number | null;
}

// getErrorGroupsFromDB's own shape - plus the last company's name, for the
// PLATFORM_ADMIN reading the list across every company.
export interface ErrorGroupWithCompany extends ErrorGroup {
  last_company_name: string | null;
}

// One occurrence, as recorded - already fingerprinted and truncated by
// error_log.fingerprint.ts.
export interface RecordErrorData {
  fingerprint: string;
  source: ErrorSource;
  name: string;
  message: string;
  stack: string | null;
  location: string | null;
  company_id: number | null;
  user_id: number | null;
}

export type ErrorGroupStatus = "open" | "resolved" | "all";
