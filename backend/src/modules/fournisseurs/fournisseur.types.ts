import { Adresse } from "../clients/adresse.types";

export type Fournisseur = {
  id: number;
  id_entreprise: number;
  code_fournisseur: string;
  societe: string;
  categorie: string;
  actif: boolean;
};

export interface FournisseurWithAdresses extends Fournisseur {
  adresses: Adresse[];
}
