export interface Chantier {
  id: number;
  id_entreprise: number;
  id_client: number;
  id_type_chantier: number;
  nom: string;
  remarque: string | null;
  adresse_identique_client: boolean;
  rue: string | null;
  npa: string | null;
  ville: string | null;
  pays: string | null;
  date_creation: Date;
}

export interface ChantierWithType extends Omit<Chantier, "id_type_chantier"> {
  type_chantier: string;
}

export interface CreateChantierData {
  id_client: number;
  id_entreprise: number;
  id_type_chantier: number;
  nom: string;
  remarque?: string | null;
  adresse_identique_client: boolean;
  rue?: string | null;
  npa?: string | null;
  ville?: string | null;
  pays?: string | null;
}
