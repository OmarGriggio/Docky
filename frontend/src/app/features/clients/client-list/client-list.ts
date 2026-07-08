import { Component, inject, OnInit, signal } from '@angular/core';
import { ClientService } from '../client.service';
import { Client } from '../../../shared/models/client';

@Component({
  selector: 'app-client-list',
  standalone: true,
  templateUrl: './client-list.html'
})
export class ClientListComponent implements OnInit {

  private clientService = inject(ClientService);

  clients = signal<Client[]>([]);

  ngOnInit(): void {
    this.clientService.getClients().subscribe({
      next: data => {
        this.clients.set(data);
      },
      error: err => {
        console.error("client-list : " + err);
      }
    });
  }

}