export type Facture = {
  id: number;

  id_client: number;

  num_facture: string;
  date: string; // ISO string recommandé côté API

  montant_ht: number;
  montant_ttc: number;

  rabais: number;
  statut: string;
};