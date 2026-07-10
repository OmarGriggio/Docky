import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ClientService } from '../client.service';
import { Client } from '../../../shared/models/client';
import { Button } from 'primeng/button';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [RouterLink, TableModule, Menu, Button, ConfirmDialogComponent],
  templateUrl: './client-list.html'
})
export class ClientListComponent implements OnInit {

  private clientService = inject(ClientService);

  clients = signal<Client[]>([]);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private clientPendingDelete: Client | null = null;

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
        command: () => this.deleteClient(client)
      },
      {
        label: 'Modifier',
        command: () => console.log("Modifier")
      },
      {
        label: 'Détail',
        command: () => console.log("Détail")
      },
    ];
  }

  private deleteClient(client: Client): void {
    this.clientPendingDelete = client;
    this.confirmMessage.set(`Supprimer le client ${client.num_client} ?`);
    this.confirmVisible.set(true);
  }

  onDeleteConfirmed(): void {
    const client = this.clientPendingDelete;
    if (!client) {
      return;
    }
    this.clientPendingDelete = null;

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
