import { Adresse } from './adresse';

export interface Fournisseur {
  id: number;
  code_fournisseur: string;
  societe: string;
  categorie: string;
  actif: boolean;
}

export interface FournisseurWithAdresses extends Fournisseur {
  adresses: Adresse[];
}
