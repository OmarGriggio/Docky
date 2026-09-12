import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocumentComplete } from '../../shared/models/document-complete';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

// A document with its sections+lines already joined in one response - used
// by document-form.ts to pre-fill a "Dupliquer" of an existing quote,
// instead of three separate calls (document/document-section/document-line).
@Injectable({
  providedIn: 'root'
})
export class DocumentCompleteService {

  private http = inject(HttpClient);

  getDocumentComplete(id: number) {
    return this.http.get<DocumentComplete>(`${API_BASE}/document-complete/${id}`);
  }

}
