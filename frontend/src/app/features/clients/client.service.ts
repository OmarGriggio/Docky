import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, ClientWithAddresses } from '../../shared/models/client';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  private http = inject(HttpClient);

  getClients(includeArchived = false) {
    return this.http.get<Client[]>(`${API_BASE}/client`, {
      params: includeArchived ? { includeArchived: 'true' } : {}
    });
  }

  getClient(id: number) {
    return this.http.get<ClientWithAddresses>(`${API_BASE}/client/${id}`);
  }

  createClient(client: Omit<Client, 'id' | 'is_active'>) {
    return this.http.post<Client>(`${API_BASE}/client`, client);
  }

  archiveClient(id: number) {
    return this.http.patch<Client>(`${API_BASE}/client/${id}/archive`, {});
  }

  unarchiveClient(id: number) {
    return this.http.patch<Client>(`${API_BASE}/client/${id}/unarchive`, {});
  }
}
