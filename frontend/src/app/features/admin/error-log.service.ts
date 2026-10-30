import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ErrorGroup, ErrorGroupStatus } from '../../shared/models/error-group';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ErrorLogService {

  private http = inject(HttpClient);

  getErrorGroups(status: ErrorGroupStatus) {
    return this.http.get<ErrorGroup[]>(`${API_BASE}/error-log`, { params: { status } });
  }

  resolve(id: number) {
    return this.http.patch<void>(`${API_BASE}/error-log/${id}/resolve`, {});
  }

  reopen(id: number) {
    return this.http.patch<void>(`${API_BASE}/error-log/${id}/reopen`, {});
  }
}
