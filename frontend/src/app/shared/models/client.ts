import { Adresse } from './adresse';

export interface Client {
  id: number;
  num_client: string;
  societe: string | null;
  tva: string | null;
  nom: string | null;
  prenom: string | null;
  civilite: string | null;
  email: string;
  telephone: string | null;
  remarque: string | null;
}

export interface ClientWithAdresses extends Client {
  adresses: Adresse[];
}
