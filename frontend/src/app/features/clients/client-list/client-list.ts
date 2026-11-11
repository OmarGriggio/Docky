import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule, TableRowExpandEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tabs, TabList, Tab } from 'primeng/tabs';
import { MenuItem } from 'primeng/api';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { forkJoin, Observable, of } from 'rxjs';
import { ClientService } from '../client.service';
import { AddressService } from '../../addresses/address.service';
import { Address } from '../../../shared/models/address';
import { Client, ClientLanguage, ClientListItem, ClientType } from '../../../shared/models/client';
import { Button } from 'primeng/button';
import { ClientForm } from '../client-form/client-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ListToolbarComponent } from '../../../shared/components/list-toolbar/list-toolbar';
import { archiveActionLabel, documentStatusLabel, documentStatusSeverity, matchesSearch } from '../../../shared/utils/display';
import { DocumentService } from '../../documents/document.service';
import { Document } from '../../../shared/models/document';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { BreakpointService } from '../../../shared/services/breakpoint.service';

// Stable shared reference for "no documents yet" - see document-list.ts's
// own EMPTY_LINES for why (a freshly-allocated [] on every template check
// would look like new data every time).
const EMPTY_DOCUMENTS: Document[] = [];

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [RouterLink, ListToolbarComponent, TableModule, TagModule, Menu, Button, Dialog, InputText, Select, Tabs, TabList, Tab, FormsModule, AppDatePipe, PricePipe, ClientForm, ConfirmDialogComponent, TranslocoPipe],
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
  private addressService = inject(AddressService);
  isMobile = inject(BreakpointService).isMobile;
  private documentService = inject(DocumentService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);

  clients = signal<ClientListItem[]>([]);

  // The toolbar's search box - matches any column of the table (number,
  // type as displayed, company, first/last name, email, phone), each typed
  // word anywhere among them. Done in the browser on the already-loaded
  // list, so it also covers the archived ones when "Afficher les archivés"
  // is on.
  search = signal('');
  // The Professionnels/Particuliers tabs - the search only looks within the
  // active one.
  activeType = signal<ClientType>('PROFESSIONAL');
  filteredClients = computed(() =>
    this.clients().filter(client =>
      client.type === this.activeType() && matchesSearch(this.searchableText(client), this.search())
    )
  );

  private searchableText(client: ClientListItem): string {
    // Always French regardless of the active UI language - this text is
    // never shown, only matched against what's typed in the search box, and
    // changing it would mean deciding which language a search is "in".
    return [
      client.client_number,
      client.type === 'PROFESSIONAL' ? 'Professionnel' : 'Particulier',
      client.company_name,
      client.first_name,
      client.last_name,
      client.email,
      client.phone,
      client.address_street,
      client.address_postal_code,
      client.address_city,
    ].filter(Boolean).join(' ');
  }
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

  private frenchLabel = translateSignal('clients.languageFrench');
  private englishLabel = translateSignal('clients.languageEnglish');
  private germanLabel = translateSignal('clients.languageGerman');
  private italianLabel = translateSignal('clients.languageItalian');

  languageOptions = computed<{ label: string; value: ClientLanguage }[]>(() => [
    { label: this.frenchLabel(), value: 'FR' },
    { label: this.englishLabel(), value: 'EN' },
    { label: this.germanLabel(), value: 'DE' },
    { label: this.italianLabel(), value: 'IT' },
  ]);

  languageLabel(language: ClientLanguage): string {
    return this.languageOptions().find(option => option.value === language)?.label ?? language;
  }

  ngOnInit(): void {
    this.loadClients();
  }

  private loadClients(): void {
    this.clientService.getClients(this.showArchived()).subscribe({
      next: data => {
        // "Non défini" isn't a client of its own (see shared/models/client.ts).
        this.clients.set(data.filter(client => !client.is_placeholder));
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

  // archiveActionLabel's own label stays French for now - shared/utils/
  // display.ts is used across every list page (clients, suppliers, projects,
  // resources, documents), most not translated yet; see conversation notes.
  getActions(client: Client): MenuItem[] {
    return [
      {
        label: archiveActionLabel(client.is_active),
        command: () => client.is_active ? this.archiveClient(client) : this.unarchiveClient(client)
      },
      {
        label: this.transloco.translate('clients.duplicate'),
        command: () => this.duplicateClient(client)
      },
      {
        label: this.transloco.translate('common.detail'),
        command: () => this.router.navigate(['/clients', client.id])
      },
    ];
  }

  private archiveClient(client: Client): void {
    this.clientPendingArchive = client;
    this.confirmMessage.set(this.transloco.translate('clients.archiveConfirm', { number: client.client_number }));
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
  private clonedClients: Record<number, ClientListItem> = {};

  onRowEditInit(client: ClientListItem): void {
    this.clonedClients[client.id] = { ...client };
  }

  // Sends the client's full editable field set (not just whatever changed),
  // same "PUT the whole editable shape" convention as document-form.ts's own
  // updateDocument - and its address alongside, in parallel.
  onRowEditSave(client: ClientListItem): void {
    // Same rules as the new client form: a company name for a professional,
    // a last name for an individual, and an address is street + NPA + town
    // or nothing at all (a client without one can be left without one) -
    // otherwise the edit is undone.
    const name = client.type === 'PROFESSIONAL' ? client.company_name : client.last_name;
    const addressFields = [client.address_street, client.address_postal_code, client.address_city];
    const addressFilled = addressFields.every(value => value?.trim());
    const addressEmpty = addressFields.every(value => !value?.trim());
    if (!name?.trim() || (!addressFilled && (client.address_id !== null || !addressEmpty))) {
      this.onRowEditCancel(client);
      return;
    }
    forkJoin({
      client: this.clientService.updateClient(client.id, {
        type: client.type,
        company_name: client.company_name,
        last_name: client.last_name,
        first_name: client.first_name,
        title: client.title,
        email: client.email,
        phone: client.phone,
        note: client.note,
        language: client.language,
      }),
      address: this.saveAddress(client, addressFilled),
    }).subscribe({
      // Mutate the *same* client object in place with the server's
      // canonical values, rather than swapping in a new object (or
      // reloading the whole list) - see resource-list.ts's own
      // onCellEditComplete for why a changed reference is worth avoiding
      // even here. Still bumping the array reference (a shallow copy) so
      // the clients() signal formally changes for anything else watching it.
      next: ({ client: updated, address }) => {
        Object.assign(client, updated);
        if (address) {
          Object.assign(client, {
            address_id: address.id,
            address_attention: address.attention,
            address_street: address.street,
            address_postal_code: address.postal_code,
            address_city: address.city,
            address_country: address.country,
          });
        }
        this.clients.update(clients => [...clients]);
        delete this.clonedClients[client.id];
      },
      // One of the two may have been saved - reload rather than guess.
      error: err => {
        console.error('client-list : ' + err);
        delete this.clonedClients[client.id];
        this.loadClients();
      }
    });
  }

  // The row's address: the existing one updated (its attention and country
  // kept as they are), or a first one created - primary, Swiss, like the
  // client form's - when a client without one gets an address here.
  private saveAddress(client: ClientListItem, filled: boolean): Observable<Address | null> {
    if (!filled) {
      return of(null);
    }
    const fields = {
      street: client.address_street!.trim(),
      postal_code: client.address_postal_code!.trim(),
      city: client.address_city!.trim(),
    };
    if (client.address_id !== null) {
      return this.addressService.updateAddress(client.address_id, {
        ...fields,
        attention: client.address_attention,
        country: client.address_country ?? this.transloco.translate('clients.form.defaultCountry'),
      });
    }
    return this.addressService.createAddress({
      ...fields,
      client_id: client.id,
      is_primary: true,
      attention: null,
      country: this.transloco.translate('clients.form.defaultCountry'),
    });
  }

  onRowEditCancel(client: ClientListItem): void {
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
