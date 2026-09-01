import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Document, DocumentType } from '../../shared/models/document';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private http = inject(HttpClient);

  getDocuments(type?: DocumentType) {
    return this.http.get<Document[]>('http://localhost:3000/document', {
      params: type ? { type } : {}
    });
  }

  createDocument(document: Omit<Document, 'id'>) {
    return this.http.post<Document>('http://localhost:3000/document', document);
  }

  getFacturePdf(id: number) {
    return this.http.get(`http://localhost:3000/pdf/facture/${id}`, { responseType: 'blob' });
  }
}
