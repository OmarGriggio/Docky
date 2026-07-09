export interface Facture {
  id: number;
  id_client: number;
  num_facture: string;
  date: string;
  montant_ht: number;
  montant_ttc: number;
  rabais: number;
  statut: string;
}
