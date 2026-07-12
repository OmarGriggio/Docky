export interface TypeChantier {
  id: number;
  libelle: string;
}

export interface Chantier {
  id: number;
  id_client: number;
  type_chantier: string;
  nom: string;
  remarque: string | null;
  adresse_identique_client: boolean;
  rue: string | null;
  npa: string | null;
  ville: string | null;
  pays: string | null;
  date_creation: string;
}

export interface CreateChantierPayload {
  id_client: number;
  id_type_chantier: number;
  nom: string;
  remarque?: string | null;
  adresse_identique_client: boolean;
  rue?: string | null;
  npa?: string | null;
  ville?: string | null;
  pays?: string | null;
}
