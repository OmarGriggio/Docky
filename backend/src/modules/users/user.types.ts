// PLATFORM_ADMIN manages the SaaS itself (every company, not just one) — see
// role.middleware.ts. There's no self-service way to create one: company_id stays
// NOT NULL on purpose (see CLAUDE.md), so a platform-admin account is always created
// by hand directly in the database, never through POST /user.
export type Role = 'ADMIN' | 'USER' | 'PLATFORM_ADMIN';

export interface User {
  id: number;
  company_id: number;
  role: Role;
  last_name: string;
  first_name: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date | null;
  last_login_at: Date | null;
  is_active: boolean;
}

export interface CreateUserData {
  company_id: number;
  role: Role,
  firstname: string;
  lastname: string;
  email: string;
  passwordHash: string;
}

export interface LoginUserData {
  email: string;
  passwordHash: string;
}
