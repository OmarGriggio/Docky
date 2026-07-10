import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { DocumentService } from '../document.service';
import { Document, DocumentType } from '../../../shared/models/document';

const TYPE_LABELS: Record<DocumentType, string> = {
  'OFFRE': 'Offres',
  'FACTURE': 'Factures',
};

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [TableModule],
  templateUrl: './document-list.html'
})
export class DocumentListComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private documentService = inject(DocumentService);

  documents = signal<Document[]>([]);
  currentTypeLabel = signal<string | null>(null);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const type = params.get('type') as DocumentType | null;
      this.currentTypeLabel.set(type ? TYPE_LABELS[type] : null);

      this.documentService.getDocuments(type ?? undefined).subscribe({
        next: data => {
          this.documents.set(data);
        },
        error: err => {
          console.error('document-list : ' + err);
        }
      });
    });
  }

}
