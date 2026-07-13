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