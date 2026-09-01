import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import { MenuItem } from 'primeng/api';
import { ClientService } from '../client.service';
import { Client } from '../../../shared/models/client';
import { Button } from 'primeng/button';
import { ClientForm } from '../client-form/client-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [TableModule, Menu, Button, Dialog, Checkbox, FormsModule, ClientForm, ConfirmDialogComponent],
  templateUrl: './client-list.html',
  styleUrl: './client-list.css'
})
export class ClientListComponent implements OnInit {

  private clientService = inject(ClientService);

  clients = signal<Client[]>([]);
  showArchived = signal(false);

  createDialogVisible = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private clientPendingArchive: Client | null = null;

  ngOnInit(): void {
    this.loadClients();
  }

  private loadClients(): void {
    this.clientService.getClients(this.showArchived()).subscribe({
      next: data => {
        this.clients.set(data);
      },
      error: err => {
        console.error("client-list : " + err);
      }
    });
  }

  onShowArchivedChange(value: boolean): void {
    this.showArchived.set(value);
    this.loadClients();
  }

  onClientSaved(): void {
    this.createDialogVisible.set(false);
    this.loadClients();
  }

  getActions(client: Client): MenuItem[] {
    return [
      client.actif
        ? { label: 'Archiver', command: () => this.archiveClient(client) }
        : { label: 'Restaurer', command: () => this.unarchiveClient(client) },
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

  private archiveClient(client: Client): void {
    this.clientPendingArchive = client;
    this.confirmMessage.set(`Archiver le client ${client.num_client} ?`);
    this.confirmVisible.set(true);
  }

  onArchiveConfirmed(): void {
    const client = this.clientPendingArchive;
    if (!client) {
      return;
    }
    this.clientPendingArchive = null;

    this.clientService.archiveClient(client.id).subscribe({
      next: () => {
        this.loadClients();
      },
      error: err => {
        console.error("client-list : " + err);
      }
    });
  }

  private unarchiveClient(client: Client): void {
    this.clientService.unarchiveClient(client.id).subscribe({
      next: () => {
        this.loadClients();
      },
      error: err => {
        console.error("client-list : " + err);
      }
    });
  }

}
