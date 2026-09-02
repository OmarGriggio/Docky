export interface Adresse {
  id: number;
  id_client: number | null;
  id_fournisseur: number | null;
  principale: boolean;
  rue: string;
  npa: string;
  ville: string;
  pays: string;
}
