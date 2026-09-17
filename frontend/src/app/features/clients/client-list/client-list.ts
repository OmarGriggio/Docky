import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule, TableRowExpandEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
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
import { archiveActionLabel, documentStatusLabel, documentStatusSeverity } from '../../../shared/utils/display';
import { DocumentService } from '../../documents/document.service';
import { Document } from '../../../shared/models/document';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

// Stable shared reference for "no documents yet" - see document-list.ts's
// own EMPTY_LINES for why (a freshly-allocated [] on every template check
// would look like new data every time).
const EMPTY_DOCUMENTS: Document[] = [];

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [TableModule, TagModule, Toolbar, Menu, Button, Dialog, Checkbox, InputText, Select, FormsModule, AppDatePipe, ClientForm, ConfirmDialogComponent],
  templateUrl: './client-list.html',
  // Tried ChangeDetectionStrategy.OnPush here as an experiment - reverted.
  // It broke switching directly from one cell's edit mode to another
  // (click cell A, then click cell B without clicking outside the table
  // first): B's input flashed and immediately reverted. Most likely
  // PrimeNG's own cell-edit-switching logic doesn't reliably propagate a
  // markForCheck() up through an OnPush ancestor in that exact sequence -
  // not confirmed against PrimeNG's own source, just the cleanest
  // explanation matching the symptom. Revisit if this needs solving for
  // real; for now, default detection.
})
export class ClientListComponent implements OnInit {

  private clientService = inject(ClientService);
  private documentService = inject(DocumentService);
  private router = inject(Router);

  clients = signal<Client[]>([]);
  showArchived = signal(false);

  // Expandable rows - a client's own quotes/invoices (see onRowExpand
  // below), fetched lazily the first time a row is expanded and kept
  // around after that. Signals, not plain mutated Maps/Sets - see
  // document-list.ts's own comment for why that matters (a real NG0100
  // was caused by exactly that).
  expandedRowKeys: Record<number, boolean> = {};
  private documentsByClientId = signal(new Map<number, Document[]>());
  private loadingDocumentIds = signal(new Set<number>());

  createDialogVisible = signal(false);
  // Set when "Dupliquer" is used - passed to <app-client-form> so it can
  // pre-fill itself. null means the dialog opened fresh via "Ajouter".
  duplicateSource = signal<Client | null>(null);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private clientPendingArchive: Client | null = null;

  // Computed once, right when the ⋮ button is clicked - see
  // user-list.ts's own openActionsMenu for why a live
  // [model]="getActions(client)" template expression breaks p-menu (it
  // needs a click, then a second one, to actually fire an action).
  menuItems: MenuItem[] = [];

  openActionsMenu(menu: Menu, event: Event, client: Client): void {
    this.menuItems = this.getActions(client);
    menu.toggle(event);
  }

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

  // Row edit mode (see client-list.html's editMode="row" and [pEditableRow])
  // - a snapshot of each client currently being edited, taken on
  // onRowEditInit, so onRowEditCancel (or a failed save) can restore it.
  // Keyed by id, not held on the client object itself.
  private clonedClients: Record<number, Client> = {};

  onRowEditInit(client: Client): void {
    this.clonedClients[client.id] = { ...client };
  }

  // Sends the client's full editable field set (not just whatever changed),
  // same "PUT the whole editable shape" convention as document-form.ts's own
  // updateDocument.
  onRowEditSave(client: Client): void {
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
      // Mutate the *same* client object in place with the server's
      // canonical values, rather than swapping in a new object (or
      // reloading the whole list) - see resource-list.ts's own
      // onCellEditComplete for why a changed reference is worth avoiding
      // even here. Still bumping the array reference (a shallow copy) so
      // the clients() signal formally changes for anything else watching it.
      next: updated => {
        Object.assign(client, updated);
        this.clients.update(clients => [...clients]);
        delete this.clonedClients[client.id];
      },
      error: err => {
        console.error('client-list : ' + err);
        this.onRowEditCancel(client);
      }
    });
  }

  onRowEditCancel(client: Client): void {
    const original = this.clonedClients[client.id];
    if (original) {
      Object.assign(client, original);
      delete this.clonedClients[client.id];
    }
    this.clients.update(clients => [...clients]);
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

  onRowExpand(event: TableRowExpandEvent<Client>): void {
    const client = event.data;
    if (this.documentsByClientId().has(client.id) || this.loadingDocumentIds().has(client.id)) {
      return;
    }

    this.loadingDocumentIds.update(ids => new Set(ids).add(client.id));
    // No type filter - PROJECT documents come back too (a chantier is also
    // linked to a client_id), filtered out here since chantiers already
    // have their own list (project-list.ts) and don't belong in "this
    // client's own quotes/invoices".
    this.documentService.getDocuments(undefined, false, client.id).subscribe({
      next: documents => {
        const quotesAndInvoices = documents.filter(d => d.type !== 'PROJECT');
        this.documentsByClientId.update(map => new Map(map).set(client.id, quotesAndInvoices));
        this.loadingDocumentIds.update(ids => {
          const next = new Set(ids);
          next.delete(client.id);
          return next;
        });
      },
      error: err => {
        console.error('client-list : ' + err);
        this.loadingDocumentIds.update(ids => {
          const next = new Set(ids);
          next.delete(client.id);
          return next;
        });
      }
    });
  }

  isLoadingDocuments(client: Client): boolean {
    return this.loadingDocumentIds().has(client.id);
  }

  documentsFor(client: Client): Document[] {
    return this.documentsByClientId().get(client.id) ?? EMPTY_DOCUMENTS;
  }

  // document.status is only null for a PROJECT document (see
  // shared/models/document.ts) - never seen here (documentsFor() above
  // already filters those out), but the type still allows it.
  statusLabel(document: Document): string {
    return document.status ? documentStatusLabel(document.status) : '—';
  }

  statusSeverity(document: Document): 'secondary' | 'info' | 'success' | 'danger' {
    return document.status ? documentStatusSeverity(document.status) : 'secondary';
  }

  openDocument(document: Document): void {
    this.router.navigate(['/documents', document.id]);
  }

}
