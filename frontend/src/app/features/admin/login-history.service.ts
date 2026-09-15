import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginHistoryEntry } from '../../shared/models/login-history';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class LoginHistoryService {

  private http = inject(HttpClient);

  getLoginHistory(limit = 100) {
    return this.http.get<LoginHistoryEntry[]>(`${API_BASE}/login-history`, {
      params: { limit }
    });
  }
}
