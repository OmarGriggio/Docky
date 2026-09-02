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

  getLogoUrl(logo: string | null): string | null {
    return logo ? `${API_BASE}/uploads/${logo}` : null;
  }

}
