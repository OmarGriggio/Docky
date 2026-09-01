import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, ClientWithAdresses } from '../../shared/models/client';

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  private http = inject(HttpClient);

  getClients(includeArchived = false) {
    return this.http.get<Client[]>('http://localhost:3000/client', {
      params: includeArchived ? { includeArchived: 'true' } : {}
    });
  }

  getClient(id: number) {
    return this.http.get<ClientWithAdresses>(`http://localhost:3000/client/${id}`);
  }

  createClient(client: Omit<Client, 'id' | 'actif'>) {
    return this.http.post<Client>('http://localhost:3000/client', client);
  }

  archiveClient(id: number) {
    return this.http.patch<Client>(`http://localhost:3000/client/${id}/archive`, {});
  }

  unarchiveClient(id: number) {
    return this.http.patch<Client>(`http://localhost:3000/client/${id}/unarchive`, {});
  }
}
