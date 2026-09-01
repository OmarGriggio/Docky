// TODO (security): the README plans 3 user types (employee, company admin, platform
// admin) but this enum only has the first two — there's no platform-admin role yet,
// and nothing enforces `role` anywhere (no requireRole/requireAdmin middleware).
// See entreprise.routes.ts and user.routes.ts for the endpoints that need it.
export interface User {
  id: number;
  id_entreprise: number;
  role: 'ADMIN' | 'UTILISATEUR';
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
  role: 'ADMIN' | 'UTILISATEUR',
  firstname: string;
  lastname: string;
  email: string;
  passwordHash: string;
}

export interface LoginUserData {
  email: string;
  passwordHash: string;
}