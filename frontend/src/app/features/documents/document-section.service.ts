import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocumentSection, SectionWithProject } from '../../shared/models/document-section';
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

  // The calendar's own "drag onto a date" sidebar (calendar.ts) - every
  // section still with no schedule, across every IN_PROGRESS chantier.
  getUnscheduledSections() {
    return this.http.get<SectionWithProject[]>(`${API_BASE}/document-section/unscheduled`);
  }

  // The calendar's own initial load (calendar.ts) - every already-scheduled
  // section, any chantier status.
  getScheduledSections() {
    return this.http.get<SectionWithProject[]>(`${API_BASE}/document-section/scheduled`);
  }

  createSection(section: Omit<DocumentSection, 'id' | 'company_id' | 'position' | 'is_active'>) {
    return this.http.post<DocumentSection>(`${API_BASE}/document-section`, section);
  }

  updateSection(id: number, section: Pick<DocumentSection, 'date_start' | 'date_end'>) {
    return this.http.put<DocumentSection>(`${API_BASE}/document-section/${id}`, section);
  }

  archiveSection(id: number) {
    return this.http.patch<DocumentSection>(`${API_BASE}/document-section/${id}/archive`, {});
  }

  unarchiveSection(id: number) {
    return this.http.patch<DocumentSection>(`${API_BASE}/document-section/${id}/unarchive`, {});
  }
}
