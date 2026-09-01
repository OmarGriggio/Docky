import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Ressource, RessourceType } from '../../shared/models/ressource';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class RessourceService {

  private http = inject(HttpClient);

  getRessources(type?: RessourceType, includeArchived = false) {
    return this.http.get<Ressource[]>(`${API_BASE}/ressource`, {
      params: {
        ...(type ? { type } : {}),
        ...(includeArchived ? { includeArchived: 'true' } : {})
      }
    });
  }

  archiveRessource(id: number) {
    return this.http.patch<Ressource>(`${API_BASE}/ressource/${id}/archive`, {});
  }

  unarchiveRessource(id: number) {
    return this.http.patch<Ressource>(`${API_BASE}/ressource/${id}/unarchive`, {});
  }

}
