// Mirrors the backend's login_history.types.ts LoginHistoryEntryWithUser -
// PLATFORM_ADMIN only (see login-history.service.ts).
export interface LoginHistoryEntry {
  id: number;
  user_id: number | null;
  email: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  company_id: number | null;
  company_name: string | null;
}

// Mirrors the backend's LoginHistoryUser - one user the history can be
// filtered by (every company's, only those with at least one attempt).
export interface LoginHistoryUser {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  company_name: string;
}
