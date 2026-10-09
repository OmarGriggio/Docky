import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { TableModule, TableEditCompleteEvent, TableEditInitEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { Select } from 'primeng/select';
import { MenuItem } from 'primeng/api';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { DocumentService } from '../document.service';
import { Document, DocumentType, DocumentStatus } from '../../../shared/models/document';
import { documentStatusSeverity, daysOverdue, formatPrice, matchesSearch } from '../../../shared/utils/display';
import { ClientService } from '../../clients/client.service';
import { Client } from '../../../shared/models/client';
import { AddressService } from '../../addresses/address.service';
import { Address } from '../../../shared/models/address';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ListToolbarComponent } from '../../../shared/components/list-toolbar/list-toolbar';
import { DocumentLedger } from '../../../shared/components/document-ledger/document-ledger';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [ListToolbarComponent, TableModule, TagModule, Button, Menu, Select, FormsModule, AppDatePipe, PricePipe, ConfirmDialogComponent, DocumentLedger, TranslocoPipe],
  templateUrl: './document-list.html'
})
export class DocumentListComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private clientService = inject(ClientService);
  private addressService = inject(AddressService);
  private transloco = inject(TranslocoService);

  documents = signal<Document[]>([]);
  clients = signal<Client[]>([]);
  addresses = signal<Address[]>([]);
  currentType = signal<DocumentType | null>(null);
  showArchived = signal(false);

  private documentsLabel = translateSignal('nav.documents');
  private quotesLabel = translateSignal('nav.quotes');
  private invoicesLabel = translateSignal('nav.invoices');
  private projectsLabel = translateSignal('nav.projects');

  // "Documents" alone, or "Documents — Offres"/"— Factures" when filtered by
  // type (see resource-list.ts's own toolbarTitle for the same pattern).
  // PROJECT never actually appears here (this list only ever fetches
  // QUOTE/INVOICE - see loadDocuments below) but DocumentType still includes
  // it, so the switch needs a case for it regardless.
  toolbarTitle = computed(() => {
    const type = this.currentType();
    const suffix = type === 'QUOTE' ? this.quotesLabel()
      : type === 'INVOICE' ? this.invoicesLabel()
      : type === 'PROJECT' ? this.projectsLabel()
      : null;
    return suffix ? `${this.documentsLabel()} — ${suffix}` : this.documentsLabel();
  });

  // The toolbar's search box - matches any column of the table (number,
  // client, location, date, due date, amounts, discount, status), each typed
  // word anywhere among them, on the values as displayed. Done in the
  // browser on the already-loaded list.
  search = signal('');
  filteredDocuments = computed(() =>
    this.documents().filter(document => matchesSearch(this.searchableText(document), this.search()))
  );

  private searchableText(document: Document): string {
    const appDate = new AppDatePipe();
    return [
      document.number,
      this.clientName(document),
      this.location(document),
      appDate.transform(document.date),
      appDate.transform(document.due_date),
      formatPrice(document.amount_excl_vat),
      formatPrice(document.amount_incl_vat),
      document.discount,
      this.statusLabel(document),
    ].filter(value => value !== null && value !== undefined && value !== '').join(' ');
  }

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
      this.currentType.set(params.get('type') as DocumentType | null);
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
  // filtered to QUOTE/INVOICE), but the type still allows it. Own
  // translated labels (documents.status.*), not the untranslated
  // documentStatusLabel from shared/utils/display.ts - see commit notes for
  // why that shared one isn't touched yet.
  statusLabel(document: Document): string {
    return document.status ? this.transloco.translate(`documents.status.${document.status}`) : '—';
  }

  statusSeverity(document: Document): 'secondary' | 'info' | 'success' | 'danger' {
    return document.status ? documentStatusSeverity(document.status) : 'secondary';
  }

  overdueDays(document: Document): number | null {
    return daysOverdue(document);
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
    this.router.navigate(['/documents/new'], this.currentType() ? { queryParams: { type: this.currentType() } } : {});
  }

  private loadDocuments(): void {
    this.documentService.getDocuments(this.currentType() ?? undefined, this.showArchived()).subscribe({
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

  // Statuses settable straight from the list, per type (mirrors
  // document.service.ts's SETTABLE_STATUSES on the backend, which enforces
  // it). Picking ACCEPTED still goes through the confirm dialog below
  // (onStatusEditComplete/onAcceptConfirmed) rather than saving right away -
  // it creates a chantier and carries resources over, not a plain status
  // write. Kept as two separate lists (not one shared array) so ACCEPTED
  // never leaks into an invoice's own options.
  private statusOption(status: DocumentStatus): { label: string; value: DocumentStatus } {
    return { label: this.transloco.translate(`documents.status.${status}`), value: status };
  }

  // Built fresh on every call (not cached) so each one picks up whatever
  // language is active right now - see statusLabel's own reasoning above.
  statusOptionsFor(document: Document): { label: string; value: DocumentStatus }[] {
    return document.type === 'INVOICE'
      ? [this.statusOption('DRAFT'), this.statusOption('SENT'), this.statusOption('PAID'), this.statusOption('CANCELLED')]
      : [this.statusOption('DRAFT'), this.statusOption('SENT'), this.statusOption('ACCEPTED')];
  }

  // Snapshotted right as a cell enters edit mode (before the select's own
  // ngModel can touch document.status) - onStatusEditComplete needs it to
  // tell an actual change into ACCEPTED apart from picking it again, and
  // onAcceptCancelled needs it to put the select back where it was.
  private statusBeforeEdit: DocumentStatus | null = null;

  onStatusEditInit(event: TableEditInitEvent): void {
    const document = event.index !== undefined ? this.documents()[event.index] : undefined;
    this.statusBeforeEdit = document?.status ?? null;
  }

  // Resolved via event.index (the row), not event.data: [pEditableColumn]
  // is bound to document.status itself, matching PrimeNG's own docs/
  // internal cancel-path logic - see client-list.ts's own (former)
  // onCellEditComplete for the same reasoning.
  onStatusEditComplete(event: TableEditCompleteEvent): void {
    const document = event.index !== undefined ? this.documents()[event.index] : undefined;
    if (!document || document.status === null) {
      return;
    }

    if (document.status === 'ACCEPTED' && this.statusBeforeEdit !== 'ACCEPTED') {
      this.confirmAcceptQuote(document);
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
        ? { label: this.transloco.translate('common.archive'), command: () => this.archiveDocument(document) }
        : { label: this.transloco.translate('common.unarchive'), command: () => this.unarchiveDocument(document) },
      {
        label: this.transloco.translate('documents.modify'),
        command: () => this.router.navigate(['/documents', document.id])
      },
      // Only an overdue invoice gets a payment reminder (see daysOverdue).
      ...(this.overdueDays(document) !== null
        ? [{ label: this.transloco.translate('documents.reminderPdf'), command: () => this.openReminderPdf(document) }]
        : []),
      // A quote or an invoice - a new draft pre-filled from this one (see
      // document-form.ts's applyDuplicateFrom).
      { label: this.transloco.translate('clients.duplicate'), command: () => this.duplicateDocument(document) }
    ];
  }

  private duplicateDocument(document: Document): void {
    this.router.navigate(['/documents/new'], { queryParams: { type: document.type, duplicateFrom: document.id } });
  }

  private confirmAcceptQuote(document: Document): void {
    this.documentPendingAccept = document;
    this.acceptConfirmVisible.set(true);
  }

  // The select already flipped document.status to ACCEPTED in memory (two-
  // way bound) the moment it was picked - put it back so the row doesn't
  // show "Acceptée" for a quote that was never actually validated.
  onAcceptCancelled(): void {
    const document = this.documentPendingAccept;
    if (document) {
      document.status = this.statusBeforeEdit;
    }
    this.documentPendingAccept = null;
  }

  onAcceptConfirmed(): void {
    const document = this.documentPendingAccept;
    if (!document) {
      return;
    }
    this.documentPendingAccept = null;

    this.documentService.acceptQuote(document.id).subscribe({
      next: () => this.loadDocuments(),
      error: err => {
        console.error('document-list : ' + err);
        document.status = this.statusBeforeEdit;
      }
    });
  }

  private archiveDocument(document: Document): void {
    this.documentPendingArchive = document;
    this.confirmMessage.set(this.transloco.translate('documents.archiveConfirm', { number: document.number }));
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
    this.openBlob(document.type === 'INVOICE' ? this.documentService.getInvoicePdf(document.id) : this.documentService.getQuotePdf(document.id));
  }

  private openReminderPdf(document: Document): void {
    this.openBlob(this.documentService.getReminderPdf(document.id));
  }

  private openBlob(pdf$: Observable<Blob>): void {
    pdf$.subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: err => console.error('document-list : ' + err)
    });
  }

}
