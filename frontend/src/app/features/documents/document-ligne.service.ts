import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocumentLigne } from '../../shared/models/document-ligne';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class DocumentLigneService {

  private http = inject(HttpClient);

  getLignes(id_document: number, includeArchived = false) {
    return this.http.get<DocumentLigne[]>(`${API_BASE}/document-ligne`, {
      params: {
        id_document,
        ...(includeArchived ? { includeArchived: 'true' } : {})
      }
    });
  }

  createLigne(ligne: Omit<DocumentLigne, 'id' | 'id_entreprise' | 'pos' | 'actif'>) {
    return this.http.post<DocumentLigne>(`${API_BASE}/document-ligne`, ligne);
  }

  archiveLigne(id: number) {
    return this.http.patch<DocumentLigne>(`${API_BASE}/document-ligne/${id}/archive`, {});
  }

  unarchiveLigne(id: number) {
    return this.http.patch<DocumentLigne>(`${API_BASE}/document-ligne/${id}/unarchive`, {});
  }
}
