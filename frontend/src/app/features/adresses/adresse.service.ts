import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Adresse } from '../../shared/models/adresse';

@Injectable({
  providedIn: 'root'
})
export class AdresseService {

  private http = inject(HttpClient);

  getAdresses() {
    return this.http.get<Adresse[]>('http://localhost:3000/adresse');
  }

  createAdresse(adresse: Omit<Adresse, 'id'>) {
    return this.http.post<Adresse>('http://localhost:3000/adresse', adresse);
  }
}
