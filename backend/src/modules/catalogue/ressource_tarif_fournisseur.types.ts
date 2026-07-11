export interface RessourceTarifFournisseur {
  id: number;

  id_ressource: number;
  id_fournisseur: number;

  prix_achat: number;
  rabais: number;
  delai_livraison: number;
  defaut: boolean;
}
