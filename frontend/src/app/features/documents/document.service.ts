import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Document, DocumentType, DocumentStatus } from '../../shared/models/document';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  private http = inject(HttpClient);

  getDocuments(type?: DocumentType, includeArchived = false, clientId?: number) {
    return this.http.get<Document[]>(`${API_BASE}/document`, {
      params: {
        ...(type ? { type } : {}),
        ...(includeArchived ? { includeArchived: 'true' } : {}),
        ...(clientId ? { client_id: clientId } : {})
      }
    });
  }

  getDocument(id: number) {
    return this.http.get<Document>(`${API_BASE}/document/${id}`);
  }

  createDocument(document: Omit<Document, 'id' | 'company_id' | 'is_active' | 'amount_excl_vat' | 'amount_incl_vat' | 'number'>) {
    return this.http.post<Document>(`${API_BASE}/document`, document);
  }

  // type/number/status/parent_document_id aren't editable this way - each
  // has its own dedicated flow (see document.types.ts's UpdateDocumentData
  // on the backend). address_id/reference_client ARE included even though
  // document-form.ts has no UI for them yet - the backend requires them on
  // every PUT body, so they always have to be sent explicitly (preserving
  // whatever was loaded) rather than omitted.
  updateDocument(id: number, document: Pick<Document, 'client_id' | 'address_id' | 'reference_client' | 'date' | 'discount' | 'vat_rate' | 'introduction' | 'conclusion' | 'payment_terms' | 'due_date'>) {
    return this.http.put<Document>(`${API_BASE}/document/${id}`, document);
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

  // A plain DRAFT<->SENT toggle - every other status has its own dedicated
  // flow (acceptQuote above, archive/unarchive) and is rejected server-side
  // if sent here (see document.service.ts's updateDocumentStatusServ).
  updateStatus(id: number, status: DocumentStatus) {
    return this.http.patch<Document>(`${API_BASE}/document/${id}/status`, { status });
  }

  getInvoicePdf(id: number) {
    return this.http.get(`${API_BASE}/pdf/invoice/${id}`, { responseType: 'blob' });
  }

  getQuotePdf(id: number) {
    return this.http.get(`${API_BASE}/pdf/quote/${id}`, { responseType: 'blob' });
  }
}
