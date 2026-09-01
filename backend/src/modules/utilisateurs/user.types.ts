// ADMIN_PLATEFORME manages the SaaS itself (every company, not just one) — see
// role.middleware.ts. There's no self-service way to create one: id_entreprise stays
// NOT NULL on purpose (see CLAUDE.md), so a platform-admin account is always created
// by hand directly in the database, never through POST /user.
export type Role = 'ADMIN' | 'UTILISATEUR' | 'ADMIN_PLATEFORME';

export interface User {
  id: number;
  id_entreprise: number;
  role: Role;
  nom: string;
  prenom: string;
  email: string;
  motdepasse_hash: string;
  date_creat: Date;
  date_modif: Date | null;
  date_derniere_connexion: Date | null;
  actif: boolean;
}

export interface CreateUserData {
  id_entreprise: number;
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