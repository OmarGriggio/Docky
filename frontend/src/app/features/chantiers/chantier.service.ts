import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chantier, CreateChantierPayload, TypeChantier } from '../../shared/models/chantier';

@Injectable({
  providedIn: 'root'
})
export class ChantierService {

  private http = inject(HttpClient);

  getChantiers(includeArchived = false) {
    return this.http.get<Chantier[]>('http://localhost:3000/chantier', {
      params: includeArchived ? { includeArchived: 'true' } : {}
    });
  }

  createChantier(chantier: CreateChantierPayload) {
    return this.http.post<Chantier>('http://localhost:3000/chantier', chantier);
  }

  archiveChantier(id: number) {
    return this.http.patch<Chantier>(`http://localhost:3000/chantier/${id}/archive`, {});
  }

  unarchiveChantier(id: number) {
    return this.http.patch<Chantier>(`http://localhost:3000/chantier/${id}/unarchive`, {});
  }

  getTypesChantier() {
    return this.http.get<TypeChantier[]>('http://localhost:3000/type-chantier');
  }

  createTypeChantier(libelle: string) {
    return this.http.post<TypeChantier>('http://localhost:3000/type-chantier', { libelle });
  }
}
