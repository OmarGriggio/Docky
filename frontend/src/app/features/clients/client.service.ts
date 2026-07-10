import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, ClientWithAdresses } from '../../shared/models/client';

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  private http = inject(HttpClient);

  getClients() {
    return this.http.get<Client[]>('http://localhost:3000/client');
  }

  getClient(id: number) {
    return this.http.get<ClientWithAdresses>(`http://localhost:3000/client/${id}`);
  }

  createClient(client: Omit<Client, 'id'>) {
    return this.http.post<Client>('http://localhost:3000/client', client);
  }

  deleteClient(num_client: string) {
    return this.http.delete<Client>('http://localhost:3000/client', { body: { num_client } });
  }
}
