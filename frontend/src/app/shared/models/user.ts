import { UserRole } from './auth';

export interface User {
  id: number;
  id_entreprise: number;
  role: UserRole;
  nom: string;
  prenom: string;
  email: string;
  date_creat: string;
}

export interface CreateUserPayload {
  id_entreprise: number;
  role: UserRole;
  firstname: string;
  lastname: string;
  email: string;
  passwordHash: string;
}
