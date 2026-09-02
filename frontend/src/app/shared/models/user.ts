import { UserRole } from './auth';

export interface User {
  id: number;
  company_id: number;
  role: UserRole;
  last_name: string;
  first_name: string;
  email: string;
  created_at: string;
}

export interface CreateUserPayload {
  company_id: number;
  role: UserRole;
  firstname: string;
  lastname: string;
  email: string;
  passwordHash: string;
}
