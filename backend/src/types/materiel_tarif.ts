export type MaterielTarif = {
  id: number;

  id_fournisseur: number;
  id_materiel: number;

  tarif: number;
  defaut: boolean;
  rabais: number;
  delai_livraison: number;
};