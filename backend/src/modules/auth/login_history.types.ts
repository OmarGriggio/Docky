export interface LoginHistoryEntry {
  id: number;
  user_id: number | null;
  email: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

// What auth.service.ts's authUserService records on every login attempt -
// id/created_at are set by the database.
export type CreateLoginHistoryData = Omit<LoginHistoryEntry, "id" | "created_at">;

// getLoginHistoryFromDB's own shape - the raw entry plus whatever the
// matched user/company resolve to (both null for an attempt against an
// unknown email).
export interface LoginHistoryEntryWithUser extends LoginHistoryEntry {
  first_name: string | null;
  last_name: string | null;
  company_id: number | null;
  company_name: string | null;
}
