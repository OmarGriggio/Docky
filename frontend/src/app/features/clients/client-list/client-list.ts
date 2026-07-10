import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ClientService } from '../client.service';
import { Client } from '../../../shared/models/client';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [RouterLink, TableModule, Menu],
  templateUrl: './client-list.html'
})
export class ClientListComponent implements OnInit {

  private clientService = inject(ClientService);

  clients = signal<Client[]>([]);

  ngOnInit(): void {
    this.loadClients();
  }

  private loadClients(): void {
    this.clientService.getClients().subscribe({
      next: data => {
        this.clients.set(data);
      },
      error: err => {
        console.error("client-list : " + err);
      }
    });
  }

  getActions(client: Client): MenuItem[] {
    return [
      {
        label: 'Supprimer',
        icon: 'pi pi-trash',
        command: () => this.deleteClient(client)
      }
    ];
  }

  private deleteClient(client: Client): void {
    if (!confirm(`Supprimer le client ${client.num_client} ?`)) {
      return;
    }

    this.clientService.deleteClient(client.num_client).subscribe({
      next: () => {
        this.loadClients();
      },
      error: err => {
        console.error("client-list : " + err);
      }
    });
  }

}
