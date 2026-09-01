import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Fournisseur } from '../../shared/models/fournisseur';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class FournisseurService {

  private http = inject(HttpClient);

  getFournisseurs(includeArchived = false) {
    return this.http.get<Fournisseur[]>(`${API_BASE}/fournisseur`, {
      params: includeArchived ? { includeArchived: 'true' } : {}
    });
  }

  createFournisseur(fournisseur: Omit<Fournisseur, 'id' | 'actif'>) {
    return this.http.post<Fournisseur>(`${API_BASE}/fournisseur`, fournisseur);
  }

  archiveFournisseur(id: number) {
    return this.http.patch<Fournisseur>(`${API_BASE}/fournisseur/${id}/archive`, {});
  }

  unarchiveFournisseur(id: number) {
    return this.http.patch<Fournisseur>(`${API_BASE}/fournisseur/${id}/unarchive`, {});
  }

}
