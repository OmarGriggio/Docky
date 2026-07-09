export interface OffreMateriel {
  id: number;

  id_offre: number;
  id_tarifs_materiel: number;

  pos: number;

  ref_materiel: string;
  libelle_materiel: string;

  quantite: number;

  tarif: number;

  rabais: number;
}