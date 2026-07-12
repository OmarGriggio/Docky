import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chantier, CreateChantierPayload, TypeChantier } from '../../shared/models/chantier';

@Injectable({
  providedIn: 'root'
})
export class ChantierService {

  private http = inject(HttpClient);

  getChantiers() {
    return this.http.get<Chantier[]>('http://localhost:3000/chantier');
  }

  createChantier(chantier: CreateChantierPayload) {
    return this.http.post<Chantier>('http://localhost:3000/chantier', chantier);
  }

  deleteChantier(id: number) {
    return this.http.delete<Chantier>(`http://localhost:3000/chantier/${id}`);
  }

  getTypesChantier() {
    return this.http.get<TypeChantier[]>('http://localhost:3000/type-chantier');
  }

  createTypeChantier(libelle: string) {
    return this.http.post<TypeChantier>('http://localhost:3000/type-chantier', { libelle });
  }
}
