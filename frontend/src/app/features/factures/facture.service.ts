import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Facture } from '../../shared/models/facture';

@Injectable({
  providedIn: 'root'
})
export class FactureService {

  private http = inject(HttpClient);

  getFactures() {
    return this.http.get<Facture[]>('http://localhost:3000/facture');
  }

}
