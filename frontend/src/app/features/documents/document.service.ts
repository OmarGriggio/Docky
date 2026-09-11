import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Document, DocumentType } from '../../shared/models/document';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private http = inject(HttpClient);

  getDocuments(type?: DocumentType, includeArchived = false) {
    return this.http.get<Document[]>(`${API_BASE}/document`, {
      params: {
        ...(type ? { type } : {}),
        ...(includeArchived ? { includeArchived: 'true' } : {})
      }
    });
  }

  getDocument(id: number) {
    return this.http.get<Document>(`${API_BASE}/document/${id}`);
  }

  createDocument(document: Omit<Document, 'id' | 'company_id' | 'is_active' | 'amount_excl_vat' | 'amount_incl_vat' | 'number'>) {
    return this.http.post<Document>(`${API_BASE}/document`, document);
  }

  archiveDocument(id: number) {
    return this.http.patch<Document>(`${API_BASE}/document/${id}/archive`, {});
  }

  unarchiveDocument(id: number) {
    return this.http.patch<Document>(`${API_BASE}/document/${id}/unarchive`, {});
  }

  // Turns an accepted quote into a chantier - see document.service.ts on
  // the backend (acceptQuoteServ) for what this actually does server-side.
  acceptQuote(id: number) {
    return this.http.post<Document>(`${API_BASE}/document/${id}/accept`, {});
  }

  getInvoicePdf(id: number) {
    return this.http.get(`${API_BASE}/pdf/invoice/${id}`, { responseType: 'blob' });
  }
}
