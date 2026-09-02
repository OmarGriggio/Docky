import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Adresse } from '../../shared/models/adresse';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class AdresseService {

  private http = inject(HttpClient);

  getAdresses() {
    return this.http.get<Adresse[]>(`${API_BASE}/adresse`);
  }

  createAdresse(adresse: Omit<Adresse, 'id'>) {
    return this.http.post<Adresse>(`${API_BASE}/adresse`, adresse);
  }

  deleteAdresse(id: number) {
    return this.http.delete<Adresse>(`${API_BASE}/adresse/${id}`);
  }
}
