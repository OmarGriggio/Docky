import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

// Mirrors the backend's own document-scanner.types.ts, plus `truncated`
// (added by the controller, not part of the LLM's own schema) - set when
// the extracted text was too long and got cut before reaching the LLM (see
// document-scanner.service.ts's MAX_TEXT_LENGTH).
export interface ExtractedDocumentData {
  reference_client: string | null;
  project_name: string | null;
  address: {
    street: string | null;
    postal_code: string | null;
    city: string | null;
  } | null;
  description: string | null;
  due_date: string | null;
  estimated_amount: number | null;
  client_name_guess: string | null;
  confidence: 'high' | 'medium' | 'low';
  truncated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentScannerService {

  private http = inject(HttpClient);

  // Debugging call - just the raw text sent to the LLM, no extraction (see
  // backend's own /extract-text comment).
  extractText(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ text: string }>(`${API_BASE}/document-scanner/extract-text`, formData);
  }

  // The real pipeline - the LLM's structured extraction.
  scan(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ExtractedDocumentData>(`${API_BASE}/document-scanner/extract`, formData);
  }
}
