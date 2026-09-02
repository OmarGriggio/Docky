export type DocumentType = "OFFRE" | "FACTURE";

export type DocumentStatut = "BROUILLON" | "ENVOYE" | "ACCEPTE" | "REFUSE" | "PAYE" | "ANNULE";

export interface Document {
  id: number;

  id_entreprise: number;
  id_client: number;
  id_chantier: number | null;
  id_document_parent: number | null;
  type: DocumentType;
  numero: string;
  date: Date;
  montant_ht: number;
  montant_ttc: number;
  rabais: number;
  statut: DocumentStatut;
  introduction: string | null;
  conclusion: string | null;
  actif: boolean;
}
