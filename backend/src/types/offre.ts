export interface Offre {
  id: number;

  id_client: number;

  num_offre: string;
  date: Date;

  montant_ht: number;
  montant_ttc: number;

  rabais: number;

  statut: string;
}