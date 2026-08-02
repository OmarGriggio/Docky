import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Entreprise } from '../../shared/models/entreprise';

@Injectable({
  providedIn: 'root'
})
export class EntrepriseService {

  private http = inject(HttpClient);

  getEntreprise(id: number) {
    return this.http.get<Entreprise>(`http://localhost:3000/entreprise/${id}`);
  }

  updateEntreprise(id: number, entreprise: Omit<Entreprise, 'id'>) {
    return this.http.put<Entreprise>(`http://localhost:3000/entreprise/${id}`, entreprise);
  }

}
