import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chantier, CreateChantierPayload, TypeChantier } from '../../shared/models/chantier';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ChantierService {

  private http = inject(HttpClient);

  getChantiers(includeArchived = false) {
    return this.http.get<Chantier[]>(`${API_BASE}/chantier`, {
      params: includeArchived ? { includeArchived: 'true' } : {}
    });
  }

  createChantier(chantier: CreateChantierPayload) {
    return this.http.post<Chantier>(`${API_BASE}/chantier`, chantier);
  }

  archiveChantier(id: number) {
    return this.http.patch<Chantier>(`${API_BASE}/chantier/${id}/archive`, {});
  }

  unarchiveChantier(id: number) {
    return this.http.patch<Chantier>(`${API_BASE}/chantier/${id}/unarchive`, {});
  }

  getTypesChantier() {
    return this.http.get<TypeChantier[]>(`${API_BASE}/type-chantier`);
  }

  createTypeChantier(libelle: string) {
    return this.http.post<TypeChantier>(`${API_BASE}/type-chantier`, { libelle });
  }
}
