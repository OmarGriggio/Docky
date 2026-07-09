import { Component, inject, OnInit, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { DocumentService } from '../document.service';
import { Document } from '../../../shared/models/document';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [TableModule],
  templateUrl: './document-list.html'
})
export class DocumentListComponent implements OnInit {

  private documentService = inject(DocumentService);

  documents = signal<Document[]>([]);

  ngOnInit(): void {
    this.documentService.getDocuments().subscribe({
      next: data => {
        this.documents.set(data);
      },
      error: err => {
        console.error('document-list : ' + err);
      }
    });
  }

}
