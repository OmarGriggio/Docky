export type DocumentType = "OFFRE" | "FACTURE";

export interface Document {
  id: number;

  id_client: number;

  type: DocumentType;
  numero: string;
  date: Date;

  montant_ht: number;
  montant_ttc: number;

  rabais: number;

  statut: string;
}
