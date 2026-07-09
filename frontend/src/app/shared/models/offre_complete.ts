import { Offre } from './offre';
import { OffreMateriel } from './offre_materiel';
import { OffreService } from './offre_service';

export interface OffreDetail extends Offre {
  materiels: OffreMateriel[];
  services: OffreService[];
}
