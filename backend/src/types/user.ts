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
  firstname: string;
  lastname: string;
  email: string;
  passwordHash: string;
}