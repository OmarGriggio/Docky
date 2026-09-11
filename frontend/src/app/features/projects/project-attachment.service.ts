import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProjectAttachment } from '../../shared/models/project-attachment';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ProjectAttachmentService {

  private http = inject(HttpClient);

  getAttachments(projectId: number, includeArchived = false) {
    return this.http.get<ProjectAttachment[]>(`${API_BASE}/project-attachment`, {
      params: { project_id: projectId, ...(includeArchived ? { includeArchived: 'true' } : {}) }
    });
  }

  uploadAttachment(projectId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ProjectAttachment>(`${API_BASE}/project-attachment/${projectId}`, formData);
  }

  // Authenticated + company-scoped route (not the plain /uploads/... one
  // logos use) - the auth interceptor attaches the token automatically, so
  // this can't be a plain <a href>, it has to go through HttpClient as a
  // blob (see project-attachments.ts).
  downloadAttachment(id: number) {
    return this.http.get(`${API_BASE}/project-attachment/${id}/download`, { responseType: 'blob' });
  }

  archiveAttachment(id: number) {
    return this.http.patch<ProjectAttachment>(`${API_BASE}/project-attachment/${id}/archive`, {});
  }

  unarchiveAttachment(id: number) {
    return this.http.patch<ProjectAttachment>(`${API_BASE}/project-attachment/${id}/unarchive`, {});
  }

}
