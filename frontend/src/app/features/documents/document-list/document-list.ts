import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Toolbar } from 'primeng/toolbar';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { Checkbox } from 'primeng/checkbox';
import { MenuItem } from 'primeng/api';
import { DocumentService } from '../document.service';
import { Document, DocumentType } from '../../../shared/models/document';
import { ClientService } from '../../clients/client.service';
import { Client } from '../../../shared/models/client';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

const TYPE_LABELS: Record<DocumentType, string> = {
  'QUOTE': 'Offres',
  'INVOICE': 'Factures',
};

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [TableModule, Toolbar, Button, Menu, Checkbox, FormsModule, AppDatePipe, ConfirmDialogComponent],
  templateUrl: './document-list.html'
})
export class DocumentListComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private clientService = inject(ClientService);

  documents = signal<Document[]>([]);
  clients = signal<Client[]>([]);
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
  }

  clientName(document: Document): string {
    return this.clientNames().get(document.client_id) ?? '—';
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
