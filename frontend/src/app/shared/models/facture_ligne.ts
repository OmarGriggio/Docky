export interface FactureLigne {
  id: number;
  id_facture: number;
  id_tarifs_materiel: number | null;
  id_employe_categorie: number | null;
  pos: number;
  ref_materiel: string | null;
  libelle_materiel: string | null;
  quantite_materiel: number | null;
  tarif_materiel: number | null;
  libelle_employe: string | null;
  temps_employe: number | null;
  tarif_employe: number | null;
}
