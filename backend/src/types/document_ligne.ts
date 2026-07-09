export type DocumentLigneType = "MATERIEL" | "SERVICE";

export interface DocumentLigne {
  id: number;

  id_document: number;

  pos: number;
  type: DocumentLigneType;

  libelle: string;

  quantite: number;
  unite: string | null;

  prix_unitaire: number;

  rabais: number;

  id_tarifs_materiel: number | null;
  id_service: number | null;
}
