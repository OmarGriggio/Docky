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

  createLine(line: Omit<DocumentLine, 'id' | 'company_id' | 'position' | 'is_active'>) {
    return this.http.post<DocumentLine>(`${API_BASE}/document-line`, line);
  }

  archiveLine(id: number) {
    return this.http.patch<DocumentLine>(`${API_BASE}/document-line/${id}/archive`, {});
  }

  unarchiveLine(id: number) {
    return this.http.patch<DocumentLine>(`${API_BASE}/document-line/${id}/unarchive`, {});
  }
}
