import { Facture } from './facture';
import { FactureLigne } from './facture_ligne';

export interface FactureComplete extends Facture {
  lignes: FactureLigne[];
}