import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Fournisseur } from '../../shared/models/fournisseur';

@Injectable({
  providedIn: 'root'
})
export class FournisseurService {

  private http = inject(HttpClient);

  getFournisseurs(includeArchived = false) {
    return this.http.get<Fournisseur[]>('http://localhost:3000/fournisseur', {
      params: includeArchived ? { includeArchived: 'true' } : {}
    });
  }

  createFournisseur(fournisseur: Omit<Fournisseur, 'id' | 'actif'>) {
    return this.http.post<Fournisseur>('http://localhost:3000/fournisseur', fournisseur);
  }

  archiveFournisseur(id: number) {
    return this.http.patch<Fournisseur>(`http://localhost:3000/fournisseur/${id}/archive`, {});
  }

  unarchiveFournisseur(id: number) {
    return this.http.patch<Fournisseur>(`http://localhost:3000/fournisseur/${id}/unarchive`, {});
  }

}
