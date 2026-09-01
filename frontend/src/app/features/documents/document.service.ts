import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Document, DocumentType } from '../../shared/models/document';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private http = inject(HttpClient);

  getDocuments(type?: DocumentType, includeArchived = false) {
    return this.http.get<Document[]>('http://localhost:3000/document', {
      params: {
        ...(type ? { type } : {}),
        ...(includeArchived ? { includeArchived: 'true' } : {})
      }
    });
  }

  createDocument(document: Omit<Document, 'id'>) {
    return this.http.post<Document>('http://localhost:3000/document', document);
  }

  archiveDocument(id: number) {
    return this.http.patch<Document>(`http://localhost:3000/document/${id}/archive`, {});
  }

  unarchiveDocument(id: number) {
    return this.http.patch<Document>(`http://localhost:3000/document/${id}/unarchive`, {});
  }

  getFacturePdf(id: number) {
    return this.http.get(`http://localhost:3000/pdf/facture/${id}`, { responseType: 'blob' });
  }
}
