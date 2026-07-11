export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  motdepasse_hash: string;
  date_creat: Date;
  date_modif: Date;
}

export interface CreateUserData {
  id_entreprise: number;
  firstname: string;
  lastname: string;
  email: string;
  passwordHash: string;
}

export interface LoginUserData {
  email: string;
  passwordHash: string;
}