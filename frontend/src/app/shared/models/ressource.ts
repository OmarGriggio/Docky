export type RessourceType = 'MATERIEL' | 'MAIN-OEUVRE' | 'SOUS-TRAITANCE' | 'DIVERS';

export interface Ressource {
  id: number;
  id_ressources: number | null;
  type: RessourceType;
  code: string;
  designation: string;
  unite: string;
  prix_vente: number;
  prix_achat: number | null;
  actif: boolean;
}
