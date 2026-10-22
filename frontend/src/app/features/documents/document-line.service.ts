import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocumentLine } from '../../shared/models/document-line';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class DocumentLineService {

  private http = inject(HttpClient);

  getLines(document_id: number, includeArchived = false) {
    return this.http.get<DocumentLine[]>(`${API_BASE}/document-line`, {
      params: {
        document_id,
        ...(includeArchived ? { includeArchived: 'true' } : {})
      }
    });
  }

  // Read-only on purpose: lines are written all at once, with their sections,
  // through DocumentService.replaceContent.
}
