import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule, TableEditCompleteEvent } from 'primeng/table';
import { Toolbar } from 'primeng/toolbar';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MenuItem } from 'primeng/api';
import { ClientService } from '../client.service';
import { Client, ClientType } from '../../../shared/models/client';
import { Button } from 'primeng/button';
import { ClientForm } from '../client-form/client-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { archiveActionLabel } from '../../../shared/utils/display';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [TableModule, Toolbar, Menu, Button, Dialog, Checkbox, InputText, Select, FormsModule, ClientForm, ConfirmDialogComponent],
  templateUrl: './client-list.html'
})
export class ClientListComponent implements OnInit {

  private clientService = inject(ClientService);
  private router = inject(Router);

  clients = signal<Client[]>([]);
  showArchived = signal(false);

  createDialogVisible = signal(false);
  // Set when "Dupliquer" is used - passed to <app-client-form> so it can
  // pre-fill itself. null means the dialog opened fresh via "Ajouter".
  duplicateSource = signal<Client | null>(null);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private clientPendingArchive: Client | null = null;

  typeOptions: { label: string; value: ClientType }[] = [
    { label: 'Particulier', value: 'INDIVIDUAL' },
    { label: 'Professionnel', value: 'PROFESSIONAL' },
  ];

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

  openCreateDialog(): void {
    this.duplicateSource.set(null);
    this.createDialogVisible.set(true);
  }

  duplicateClient(client: Client): void {
    this.duplicateSource.set(client);
    this.createDialogVisible.set(true);
  }

  closeCreateDialog(): void {
    this.createDialogVisible.set(false);
    this.duplicateSource.set(null);
  }

  onClientSaved(): void {
    this.closeCreateDialog();
    this.loadClients();
  }

  getActions(client: Client): MenuItem[] {
    return [
      {
        label: archiveActionLabel(client.is_active),
        command: () => client.is_active ? this.archiveClient(client) : this.unarchiveClient(client)
      },
      {
        label: 'Dupliquer',
        command: () => this.duplicateClient(client)
      },
      {
        label: 'Modifier',
        command: () => console.log("Modifier")
      },
      {
        label: 'Détail',
        command: () => this.router.navigate(['/clients', client.id])
      },
    ];
  }

  private archiveClient(client: Client): void {
    this.clientPendingArchive = client;
    this.confirmMessage.set(`Archiver le client ${client.client_number} ?`);
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

  // PrimeNG's p-table only swaps the cell between text/input and updates
  // `client` in place via ngModel (see client-list.html's [pEditableColumn]
  // bindings) - persisting it is on us. Sends the client's full editable
  // field set (not just the one cell that changed), same "PUT the whole
  // editable shape" convention as document-form.ts's own updateDocument.
  //
  // Resolved via event.index (the row), not event.data: [pEditableColumn]
  // is bound to each cell's own value (e.g. client.email), matching how
  // PrimeNG's own docs/internal cancel-path logic expect it to be used -
  // event.data is that one field's value, not the whole row.
  onCellEditComplete(event: TableEditCompleteEvent): void {
    const client = event.index !== undefined ? this.clients()[event.index] : undefined;
    if (!client) {
      return;
    }

    this.clientService.updateClient(client.id, {
      type: client.type,
      company_name: client.company_name,
      vat_number: client.vat_number,
      last_name: client.last_name,
      first_name: client.first_name,
      title: client.title,
      email: client.email,
      phone: client.phone,
      note: client.note,
    }).subscribe({
      next: () => this.loadClients(),
      error: err => {
        console.error('client-list : ' + err);
        this.loadClients();
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
