// Mirrors the backend's error_log.types.ts ErrorGroupWithCompany - one
// distinct error, every occurrence of it counted. PLATFORM_ADMIN only (see
// error-log.service.ts).
export type ErrorSource = 'BACKEND' | 'FRONTEND';
export type ErrorGroupStatus = 'open' | 'resolved' | 'all';

export interface ErrorGroup {
  id: number;
  source: ErrorSource;
  name: string;
  message: string;
  stack: string | null;
  location: string | null;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
  last_company_id: number | null;
  last_user_id: number | null;
  last_company_name: string | null;
}
