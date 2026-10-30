import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginHistoryEntry, LoginHistoryUser } from '../../shared/models/login-history';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class LoginHistoryService {

  private http = inject(HttpClient);

  // userId null: every user's attempts, unknown emails included.
  getLoginHistory(userId: number | null = null, limit = 100) {
    return this.http.get<LoginHistoryEntry[]>(`${API_BASE}/login-history`, {
      params: userId === null ? { limit } : { limit, user_id: userId }
    });
  }

  getLoginHistoryUsers() {
    return this.http.get<LoginHistoryUser[]>(`${API_BASE}/login-history/users`);
  }
}
