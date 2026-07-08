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

}