import { Adresse } from "./adresse.types";

export type ClientType = "PARTICULIER" | "PROFESSIONNEL";

export interface Client {
  id: number;

  id_entreprise: number;

  num_client: string;
  type: ClientType;
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
