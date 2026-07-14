export type DocumentType = "OFFRE" | "FACTURE";

export interface Document {
  id: number;

  id_entreprise: number;
  id_client: number;
  id_document_parent: number | null;
  type: DocumentType;
  numero: string;
  date: Date;
  montant_ht: number;
  montant_ttc: number;
  rabais: number;
  statut: string;
  introduction: string | null;
  conclusion: string | null;
}
