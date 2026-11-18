import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Company } from '../../shared/models/company';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private http = inject(HttpClient);

  // PLATFORM_ADMIN only (the backend route itself enforces this) - every
  // company, not just the caller's own.
  getCompanies() {
    return this.http.get<Company[]>(`${API_BASE}/company`);
  }

  getCompany(id: number) {
    return this.http.get<Company>(`${API_BASE}/company/${id}`);
  }

  updateCompany(id: number, company: Omit<Company, 'id'>) {
    return this.http.put<Company>(`${API_BASE}/company/${id}`, company);
  }

  // Only the document template - the backend keeps every field a save leaves
  // out (company.service.ts's updateCompanyServ). The document form's
  // "Modèle" panel.
  updateDocumentStyle(id: number, style: Pick<Company, 'document_layout' | 'document_font'>) {
    return this.http.put<Company>(`${API_BASE}/company/${id}`, style);
  }

  uploadLogo(id: number, file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<Company>(`${API_BASE}/company/${id}/logo`, formData);
  }

  uploadHeaderImage(id: number, file: File) {
    const formData = new FormData();
    formData.append('header_image', file);
    return this.http.post<Company>(`${API_BASE}/company/${id}/header-image`, formData);
  }

  removeLogo(id: number) {
    return this.http.delete<Company>(`${API_BASE}/company/${id}/logo`);
  }

  removeHeaderImage(id: number) {
    return this.http.delete<Company>(`${API_BASE}/company/${id}/header-image`);
  }

  updatePaymentTerms(id: number, paymentTerms: string | null) {
    return this.http.patch<Company>(`${API_BASE}/company/${id}/payment-terms`, { payment_terms: paymentTerms });
  }

  // Generic - both the logo and the header image are served the same way
  // (see app.ts's /uploads/*splat), just stored under a different key.
  getFileUrl(path: string | null): string | null {
    return path ? `${API_BASE}/uploads/${path}` : null;
  }

}
