import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Fournisseur } from '../../shared/models/fournisseur';

@Injectable({
  providedIn: 'root'
})
export class FournisseurService {

  private http = inject(HttpClient);

  getFournisseurs() {
    return this.http.get<Fournisseur[]>('http://localhost:3000/fournisseur');
  }

  createFournisseur(fournisseur: Omit<Fournisseur, 'id'>) {
    return this.http.post<Fournisseur>('http://localhost:3000/fournisseur', fournisseur);
  }

  deleteFournisseur(code_fournisseur: string) {
    return this.http.delete<Fournisseur>('http://localhost:3000/fournisseur', { body: { code_fournisseur } });
  }

}
