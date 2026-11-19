import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Template, TemplateData } from '../../../shared/models/template';
import { environment } from '../../../../environments/environment';

const API_BASE = environment.apiUrl;

// The company's document templates (the backend's modules/templates). Read
// by anyone writing quotes or invoices (a document's "Modèle"), changed by
// its admin only (Paramètres > Modèles).
@Injectable({
  providedIn: 'root'
})
export class TemplateService {

  private http = inject(HttpClient);

  // Its default first, then by name.
  getTemplates(includeArchived = false) {
    return this.http.get<Template[]>(`${API_BASE}/template`, { params: { includeArchived } });
  }

  getTemplate(id: number) {
    return this.http.get<Template>(`${API_BASE}/template/${id}`);
  }

  createTemplate(data: Partial<TemplateData> & Pick<TemplateData, 'name'>) {
    return this.http.post<Template>(`${API_BASE}/template`, data);
  }

  duplicateTemplate(id: number, name: string) {
    return this.http.post<Template>(`${API_BASE}/template/${id}/duplicate`, { name });
  }

  // The backend keeps whatever a save leaves out.
  updateTemplate(id: number, data: Partial<TemplateData>) {
    return this.http.put<Template>(`${API_BASE}/template/${id}`, data);
  }

  setDefault(id: number) {
    return this.http.patch<Template>(`${API_BASE}/template/${id}/default`, {});
  }

  archive(id: number) {
    return this.http.patch<Template>(`${API_BASE}/template/${id}/archive`, {});
  }

  unarchive(id: number) {
    return this.http.patch<Template>(`${API_BASE}/template/${id}/unarchive`, {});
  }

  uploadHeaderImage(id: number, file: File) {
    const formData = new FormData();
    formData.append('header_image', file);
    return this.http.post<Template>(`${API_BASE}/template/${id}/header-image`, formData);
  }

  removeHeaderImage(id: number) {
    return this.http.delete<Template>(`${API_BASE}/template/${id}/header-image`);
  }

}
