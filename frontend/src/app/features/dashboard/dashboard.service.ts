import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OpenInvoice, PaidAmountByClient, ProjectInProgress } from '../../shared/models/dashboard';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private http = inject(HttpClient);

  getPaidAmountByClient() {
    return this.http.get<PaidAmountByClient[]>(`${API_BASE}/dashboard/paid-by-client`);
  }

  getOpenInvoices() {
    return this.http.get<OpenInvoice[]>(`${API_BASE}/dashboard/open-invoices`);
  }

  getProjectsInProgress() {
    return this.http.get<ProjectInProgress[]>(`${API_BASE}/dashboard/projects-in-progress`);
  }
}
