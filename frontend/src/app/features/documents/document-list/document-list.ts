import { Component, inject, OnInit, signal } from '@angular/core';
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

  documents = signal<Document[]>([]);
  currentTypeLabel = signal<string | null>(null);
  currentType: DocumentType | null = null;
  showArchived = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private documentPendingArchive: Document | null = null;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const type = params.get('type') as DocumentType | null;
      this.currentType = type;
      this.currentTypeLabel.set(type ? TYPE_LABELS[type] : null);
      this.loadDocuments();
    });
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

  getActions(document: Document): MenuItem[] {
    return [
      document.is_active
        ? { label: 'Archiver', command: () => this.archiveDocument(document) }
        : { label: 'Restaurer', command: () => this.unarchiveDocument(document) },
      {
        label: 'Détail',
        command: () => this.router.navigate(['/documents', document.id])
      }
    ];
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

  openInvoicePdf(document: Document): void {
    this.documentService.getInvoicePdf(document.id).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: err => console.error('document-list : ' + err)
    });
  }

}
