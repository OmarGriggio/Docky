export type MaterielTarif = {
  id: number;

  id_catalogue: number;
  id_fournisseur: number;

  prix_achat: number;
  rabais: number;
  delai_livraison: number;
  defaut: boolean;
};
