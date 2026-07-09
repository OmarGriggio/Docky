import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FactureLigne } from '../../shared/models/facture_ligne';

@Injectable({
  providedIn: 'root'
})
export class FactureLigneService {

  private http = inject(HttpClient);

  getFacturesLignes() {
    return this.http.get<FactureLigne[]>('http://localhost:3000/facture-ligne');
  }

}
