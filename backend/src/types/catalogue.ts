export type CatalogueType = "MATERIEL" | "SERVICE";

export interface Catalogue {
  id: number;

  type: CatalogueType;
  code: string;
  libelle: string;
  unite: string;

  prix_vente: number;

  actif: boolean;
}
