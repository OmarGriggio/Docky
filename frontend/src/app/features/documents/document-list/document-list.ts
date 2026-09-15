import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TableModule, TableRowExpandEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Toolbar } from 'primeng/toolbar';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { Checkbox } from 'primeng/checkbox';
import { MenuItem } from 'primeng/api';
import { DocumentService } from '../document.service';
import { DocumentSectionService } from '../document-section.service';
import { DocumentLineService } from '../document-line.service';
import { Document, DocumentType } from '../../../shared/models/document';
import { documentStatusLabel, documentStatusSeverity } from '../../../shared/utils/display';
import { DocumentSection } from '../../../shared/models/document-section';
import { DocumentLine } from '../../../shared/models/document-line';
import { ClientService } from '../../clients/client.service';
import { Client } from '../../../shared/models/client';
import { AddressService } from '../../addresses/address.service';
import { Address } from '../../../shared/models/address';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

// PROJECT documents never appear in this list (see document-list.html's own
// GET /document?type=QUOTE|INVOICE calls) but DocumentType still includes
// it, so the Record needs an entry regardless.
const TYPE_LABELS: Record<DocumentType, string> = {
  'QUOTE': 'Offres',
  'INVOICE': 'Factures',
  'PROJECT': 'Chantiers',
};

// Stable shared references for "nothing yet" - handing a nested p-table a
// freshly-allocated [] on every call (there's one every change detection
// cycle) would look like new data each time and make it redo its internal
// work non-stop. Reused instead of allocated.
const EMPTY_SECTIONS: DocumentSection[] = [];
const EMPTY_LINES: DocumentLine[] = [];

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [TableModule, TagModule, Toolbar, Button, Menu, Checkbox, FormsModule, AppDatePipe, ConfirmDialogComponent],
  templateUrl: './document-list.html'
})
export class DocumentListComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private documentSectionService = inject(DocumentSectionService);
  private documentLineService = inject(DocumentLineService);
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

  acceptConfirmVisible = signal(false);
  private documentPendingAccept: Document | null = null;

  // Expandable rows (see document-list.html) - a document's sections and
  // lines are fetched together, lazily, the first time its row is expanded,
  // not preloaded for every row up front, and kept around after that so
  // collapsing/expanding again doesn't refetch.
  //
  // These three are signals, not plain mutated Maps/Sets, deliberately: a
  // plain field mutated from an HTTP subscribe callback and read straight
  // from the template caused a real NG0100
  // (ExpressionChangedAfterItHasBeenCheckedError) - a fast-resolving local
  // request could mutate the Map/Set mid change-detection-cycle (between
  // Angular's dev-mode check and its own re-check of the same @if), so the
  // same read returned two different results within one cycle. Going
  // through .set()/.update() instead schedules its own change detection
  // properly rather than racing the current one. Always replaced with a new
  // Map/Set instance on write (never mutated in place) so the signal's own
  // equality check actually sees a change.
  expandedRowKeys: Record<number, boolean> = {};
  private sectionsByDocumentId = signal(new Map<number, DocumentSection[]>());
  // Grouped by section id (unique table-wide) rather than by document id,
  // and grouped once up front when the data arrives - so linesFor() below
  // is a plain lookup returning the same array reference every time, not a
  // re-filter on every change detection cycle (see EMPTY_LINES for why
  // that matters).
  private linesBySectionId = signal(new Map<number, DocumentLine[]>());
  private loadingSectionIds = signal(new Set<number>());

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
  // own EDITABLE_STATUSES/document.service.ts's on the backend.
  private isEditable(document: Document): boolean {
    return document.status === 'DRAFT' || document.status === 'SENT';
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

  onRowExpand(event: TableRowExpandEvent<Document>): void {
    const document = event.data;
    if (this.sectionsByDocumentId().has(document.id) || this.loadingSectionIds().has(document.id)) {
      return;
    }

    this.loadingSectionIds.update(ids => new Set(ids).add(document.id));
    forkJoin({
      sections: this.documentSectionService.getSections(document.id),
      lines: this.documentLineService.getLines(document.id)
    }).subscribe({
      next: ({ sections, lines }) => {
        this.sectionsByDocumentId.update(map => new Map(map).set(document.id, sections));
        this.linesBySectionId.update(map => {
          const next = new Map(map);
          for (const section of sections) {
            next.set(section.id, lines.filter(line => line.section_id === section.id));
          }
          return next;
        });
        this.loadingSectionIds.update(ids => {
          const next = new Set(ids);
          next.delete(document.id);
          return next;
        });
      },
      error: err => {
        console.error('document-list : ' + err);
        this.loadingSectionIds.update(ids => {
          const next = new Set(ids);
          next.delete(document.id);
          return next;
        });
      }
    });
  }

  isLoadingSections(document: Document): boolean {
    return this.loadingSectionIds().has(document.id);
  }

  sectionsFor(document: Document): DocumentSection[] {
    return this.sectionsByDocumentId().get(document.id) ?? EMPTY_SECTIONS;
  }

  linesFor(section: DocumentSection): DocumentLine[] {
    return this.linesBySectionId().get(section.id) ?? EMPTY_LINES;
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
