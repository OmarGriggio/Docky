export type UserRole = 'ADMIN' | 'UTILISATEUR';

export interface AuthResponse {
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  companyName: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}
