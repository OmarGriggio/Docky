import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client } from '../../shared/models/client';

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  private http = inject(HttpClient);

  getClients() {
    return this.http.get<Client[]>('http://localhost:3000/client');
  }

  createClient(client: Omit<Client, 'id'>) {
    return this.http.post<Client>('http://localhost:3000/client', client);
  }
}