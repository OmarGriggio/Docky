import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Ressource, RessourceType } from '../../shared/models/ressource';

@Injectable({
  providedIn: 'root'
})
export class RessourceService {

  private http = inject(HttpClient);

  getRessources(type?: RessourceType, includeArchived = false) {
    return this.http.get<Ressource[]>('http://localhost:3000/ressource', {
      params: {
        ...(type ? { type } : {}),
        ...(includeArchived ? { includeArchived: 'true' } : {})
      }
    });
  }

  archiveRessource(id: number) {
    return this.http.patch<Ressource>(`http://localhost:3000/ressource/${id}/archive`, {});
  }

  unarchiveRessource(id: number) {
    return this.http.patch<Ressource>(`http://localhost:3000/ressource/${id}/unarchive`, {});
  }

}
