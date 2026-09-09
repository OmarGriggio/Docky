import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocumentTemplate } from '../../shared/models/document-template';
import { DocumentType } from '../../shared/models/document';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class DocumentTemplateService {

  private http = inject(HttpClient);

  // Resolves to null when nothing's been saved yet for this type - not an
  // error, just means there's no default text to pre-fill with.
  getTemplate(type: DocumentType) {
    return this.http.get<DocumentTemplate | null>(`${API_BASE}/document-template`, {
      params: { type }
    });
  }

  upsertTemplate(type: DocumentType, template: { introduction: string | null; conclusion: string | null }) {
    return this.http.put<DocumentTemplate>(`${API_BASE}/document-template/${type}`, template);
  }

}
