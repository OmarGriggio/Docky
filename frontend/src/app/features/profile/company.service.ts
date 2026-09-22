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

  updatePaymentTerms(id: number, paymentTerms: string | null) {
    return this.http.patch<Company>(`${API_BASE}/company/${id}/payment-terms`, { payment_terms: paymentTerms });
  }

  // Generic - both the logo and the header image are served the same way
  // (see app.ts's /uploads/*splat), just stored under a different key.
  getFileUrl(path: string | null): string | null {
    return path ? `${API_BASE}/uploads/${path}` : null;
  }

}
