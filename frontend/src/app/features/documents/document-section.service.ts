import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocumentSection } from '../../shared/models/document-section';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class DocumentSectionService {

  private http = inject(HttpClient);

  getSections(document_id: number, includeArchived = false) {
    return this.http.get<DocumentSection[]>(`${API_BASE}/document-section`, {
      params: {
        document_id,
        ...(includeArchived ? { includeArchived: 'true' } : {})
      }
    });
  }

  createSection(section: Omit<DocumentSection, 'id' | 'company_id' | 'position' | 'is_active'>) {
    return this.http.post<DocumentSection>(`${API_BASE}/document-section`, section);
  }

  archiveSection(id: number) {
    return this.http.patch<DocumentSection>(`${API_BASE}/document-section/${id}/archive`, {});
  }

  unarchiveSection(id: number) {
    return this.http.patch<DocumentSection>(`${API_BASE}/document-section/${id}/unarchive`, {});
  }
}
