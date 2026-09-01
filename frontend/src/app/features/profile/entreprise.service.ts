import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Entreprise } from '../../shared/models/entreprise';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class EntrepriseService {

  private http = inject(HttpClient);

  getEntreprise(id: number) {
    return this.http.get<Entreprise>(`${API_BASE}/entreprise/${id}`);
  }

  updateEntreprise(id: number, entreprise: Omit<Entreprise, 'id'>) {
    return this.http.put<Entreprise>(`${API_BASE}/entreprise/${id}`, entreprise);
  }

  uploadLogo(id: number, file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<Entreprise>(`${API_BASE}/entreprise/${id}/logo`, formData);
  }

  getLogoUrl(logo: string | null): string | null {
    return logo ? `${API_BASE}/uploads/${logo}` : null;
  }

}
