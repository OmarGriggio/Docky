import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule, TableEditCompleteEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Toolbar } from 'primeng/toolbar';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { Checkbox } from 'primeng/checkbox';
import { Select } from 'primeng/select';
import { MenuItem } from 'primeng/api';
import { DocumentService } from '../document.service';
import { Document, DocumentType, DocumentStatus } from '../../../shared/models/document';
import { documentStatusLabel, documentStatusSeverity } from '../../../shared/utils/display';
import { ClientService } from '../../clients/client.service';
import { Client } from '../../../shared/models/client';
import { AddressService } from '../../addresses/address.service';
import { Address } from '../../../shared/models/address';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { DocumentLedger } from '../../../shared/components/document-ledger/document-ledger';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

// PROJECT documents never appear in this list (see document-list.html's own
// GET /document?type=QUOTE|INVOICE calls) but DocumentType still includes
// it, so the Record needs an entry regardless.
const TYPE_LABELS: Record<DocumentType, string> = {
  'QUOTE': 'Offres',
  'INVOICE': 'Factures',
  'PROJECT': 'Chantiers',
};

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [TableModule, TagModule, Toolbar, Button, Menu, Checkbox, Select, FormsModule, AppDatePipe, ConfirmDialogComponent, DocumentLedger],
  templateUrl: './document-list.html'
})
export class DocumentListComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private clientService = inject(ClientService);
  private addressService = inject(AddressService);

  documents = signal<Document[]>([]);
  clients = signal<Client[]>([]);
  addresses = signal<Address[]>([]);
  currentTypeLabel = signal<string | null>(null);
  currentType: DocumentType | null = null;
  showArchived = signal(false);

  // includeArchived on the clients fetch too - an archived client's name
  // should still resolve for a document that references them, same as
  // document-detail.ts's own clientNames.
  private clientNames = computed(() => {
    const names = new Map<number, string>();
    for (const client of this.clients()) {
      names.set(client.id, client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim());
    }
    return names;
  });

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private documentPendingArchive: Document | null = null;

  // Computed once, right when the ⋮ button is clicked - see
  // user-list.ts's own openActionsMenu for why a live
  // [model]="getActions(document)" template expression breaks p-menu (it
  // needs a click, then a second one, to actually fire an action).
  menuItems: MenuItem[] = [];

  openActionsMenu(menu: Menu, event: Event, document: Document): void {
    this.menuItems = this.getActions(document);
    menu.toggle(event);
  }

  acceptConfirmVisible = signal(false);
  private documentPendingAccept: Document | null = null;

  // Expandable rows (see document-list.html) - the row's own expand/collapse
  // state, PrimeNG's usual pattern. The document's own sections/lines
  // themselves are fetched by <app-document-ledger> once the row is
  // expanded (it's only mounted then) - see shared/components/document-ledger.
  expandedRowKeys: Record<number, boolean> = {};

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const type = params.get('type') as DocumentType | null;
      this.currentType = type;
      this.currentTypeLabel.set(type ? TYPE_LABELS[type] : null);
      this.loadDocuments();
    });

    this.clientService.getClients(true).subscribe({
      next: data => this.clients.set(data),
      error: err => console.error('document-list : ' + err)
    });

    this.addressService.getAddresses().subscribe({
      next: data => this.addresses.set(data),
      error: err => console.error('document-list : ' + err)
    });
  }

  clientName(document: Document): string {
    return this.clientNames().get(document.client_id) ?? '—';
  }

  // document.status is null for a PROJECT document only (see
  // shared/models/document.ts) - never seen here (this list is always
  // filtered to QUOTE/INVOICE), but the type still allows it.
  statusLabel(document: Document): string {
    return document.status ? documentStatusLabel(document.status) : '—';
  }

  statusSeverity(document: Document): 'secondary' | 'info' | 'success' | 'danger' {
    return document.status ? documentStatusSeverity(document.status) : 'secondary';
  }

  // Same resolution as project-detail.ts's own: the document's own picked
  // address (address_id) if it has one, else its client's primary address,
  // else whichever address of that client comes first.
  location(document: Document): string {
    const clientAddresses = this.addresses().filter(a => a.client_id === document.client_id);
    const address = clientAddresses.find(a => a.id === document.address_id)
      ?? clientAddresses.find(a => a.is_primary)
      ?? clientAddresses[0];
    return address?.street ?? '—';
  }

  // Which type gets created is decided by which filtered list you're on
  // (Offres or Factures) - there's no type picker in the form itself
  // anymore. Falls back to the form's own default (QUOTE) if this list
  // somehow isn't type-filtered.
  createDocument(): void {
    this.router.navigate(['/documents/new'], this.currentType ? { queryParams: { type: this.currentType } } : {});
  }

  private loadDocuments(): void {
    this.documentService.getDocuments(this.currentType ?? undefined, this.showArchived()).subscribe({
      next: data => {
        this.documents.set(data);
      },
      error: err => {
        console.error('document-list : ' + err);
      }
    });
  }

  onShowArchivedChange(value: boolean): void {
    this.showArchived.set(value);
    this.loadDocuments();
  }

  // A document past DRAFT/SENT is a frozen record (see
  // zz_docs/Project Definition.md's lifecycle) - matches document-form.ts's
  // own EDITABLE_STATUSES/document.service.ts's on the backend. Also gates
  // the Statut column's own editability (see statusOptions/onStatusChange
  // below) - public for the template.
  isEditable(document: Document): boolean {
    return document.status === 'DRAFT' || document.status === 'SENT';
  }

  // The only two statuses a document can be switched between straight from
  // the list (see onStatusChange) - every other one (ACCEPTED/REJECTED/PAID/
  // CANCELLED) has its own dedicated action instead ("Valider l'offre" etc.)
  // and is rejected server-side if sent through this endpoint anyway.
  statusOptions: { label: string; value: DocumentStatus }[] = [
    { label: 'Brouillon', value: 'DRAFT' },
    { label: 'Envoyée', value: 'SENT' },
  ];

  // Resolved via event.index (the row), not event.data: [pEditableColumn]
  // is bound to document.status itself, matching PrimeNG's own docs/
  // internal cancel-path logic - see client-list.ts's own (former)
  // onCellEditComplete for the same reasoning.
  onStatusEditComplete(event: TableEditCompleteEvent): void {
    const document = event.index !== undefined ? this.documents()[event.index] : undefined;
    if (!document || document.status === null) {
      return;
    }

    this.documentService.updateStatus(document.id, document.status).subscribe({
      // Mutate the *same* document object in place with the server's
      // canonical value, rather than swapping in a new object - same
      // reasoning as every other list's own row-identity fix this session.
      next: updated => {
        Object.assign(document, updated);
        this.documents.update(documents => [...documents]);
      },
      error: err => {
        console.error('document-list : ' + err);
        this.loadDocuments();
      }
    });
  }

  getActions(document: Document): MenuItem[] {
    return [
      document.is_active
        ? { label: 'Archiver', command: () => this.archiveDocument(document) }
        : { label: 'Restaurer', command: () => this.unarchiveDocument(document) },
      {
        label: 'Modifier',
        command: () => this.router.navigate(['/documents', document.id])
      },
      // Only an offer can be duplicated - a chantier is what would need
      // duplicating on an invoice, and a chantier only ever comes from an
      // accepted quote (see zz_docs/Decisions.md), never a copy of another.
      ...(document.type === 'QUOTE'
        ? [{ label: 'Dupliquer', command: () => this.duplicateDocument(document) }]
        : []),
      ...(document.type === 'QUOTE' && this.isEditable(document)
        ? [{ label: "Valider l'offre", command: () => this.confirmAcceptQuote(document) }]
        : [])
    ];
  }

  private duplicateDocument(document: Document): void {
    this.router.navigate(['/documents/new'], { queryParams: { type: 'QUOTE', duplicateFrom: document.id } });
  }

  private confirmAcceptQuote(document: Document): void {
    this.documentPendingAccept = document;
    this.acceptConfirmVisible.set(true);
  }

  onAcceptConfirmed(): void {
    const document = this.documentPendingAccept;
    if (!document) {
      return;
    }
    this.documentPendingAccept = null;

    this.documentService.acceptQuote(document.id).subscribe({
      next: () => this.loadDocuments(),
      error: err => console.error('document-list : ' + err)
    });
  }

  private archiveDocument(document: Document): void {
    this.documentPendingArchive = document;
    this.confirmMessage.set(`Archiver le document ${document.number} ?`);
    this.confirmVisible.set(true);
  }

  onArchiveConfirmed(): void {
    const document = this.documentPendingArchive;
    if (!document) {
      return;
    }
    this.documentPendingArchive = null;

    this.documentService.archiveDocument(document.id).subscribe({
      next: () => {
        this.loadDocuments();
      },
      error: err => {
        console.error('document-list : ' + err);
      }
    });
  }

  private unarchiveDocument(document: Document): void {
    this.documentService.unarchiveDocument(document.id).subscribe({
      next: () => {
        this.loadDocuments();
      },
      error: err => {
        console.error('document-list : ' + err);
      }
    });
  }

  openPdf(document: Document): void {
    const pdf$ = document.type === 'INVOICE' ? this.documentService.getInvoicePdf(document.id) : this.documentService.getQuotePdf(document.id);

    pdf$.subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: err => console.error('document-list : ' + err)
    });
  }

}
