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

  // client_number/is_active/company_id aren't editable this way - see
  // client.types.ts's UpdateClientData on the backend.
  updateClient(id: number, client: Pick<Client, 'type' | 'company_name' | 'vat_number' | 'last_name' | 'first_name' | 'title' | 'email' | 'phone' | 'note'>) {
    return this.http.put<Client>(`${API_BASE}/client/${id}`, client);
  }

  archiveClient(id: number) {
    return this.http.patch<Client>(`${API_BASE}/client/${id}/archive`, {});
  }

  unarchiveClient(id: number) {
    return this.http.patch<Client>(`${API_BASE}/client/${id}/unarchive`, {});
  }
}
