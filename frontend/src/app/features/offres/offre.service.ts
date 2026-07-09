import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Offre } from '../../shared/models/offre';

@Injectable({
  providedIn: 'root'
})
export class OffreService {

  private http = inject(HttpClient);

  getOffres() {
    return this.http.get<Offre[]>('http://localhost:3000/offre');
  }

  createOffre(offre: Omit<Offre, 'id'>) {
    return this.http.post<Offre>('http://localhost:3000/offre', offre);
  }
}
